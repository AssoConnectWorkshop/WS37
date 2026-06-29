import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Tu es QualifBot, un assistant de préqualification commerciale expert pour AssoConnect.
Tu aides les Account Executives à évaluer rapidement des associations françaises prospect (en moins de 10 minutes).

AssoConnect est un logiciel SaaS tout-en-un pour associations : adhésions, CRM membres, comptabilité, événements, dons en ligne.
L'ICP (Ideal Customer Profile) cible des associations avec plus de 200 membres, ayant des besoins de gestion numérique.

Pour chaque association donnée, produis une fiche de préqualification COMPLÈTE en markdown structuré.

## Format attendu (respecte exactement cette structure) :

### 🏛️ Mission & Organisation
Décris la mission, la structure (réseau/fédération/association simple), la taille estimée (membres, salariés, bénévoles), et le budget annuel estimé si disponible.

### 🌐 Présence Digitale
Évalue la qualité du site web (formulaires d'adhésion ? espace membre ? don en ligne ?), la présence sur les réseaux sociaux, les offres d'emploi récentes (signal de croissance), et la maturité digitale globale.

### 👑 Organigramme — Méthode des Échecs
Un bullet point par personne identifiée, sur cette ligne unique :
\`[emoji pièce] **Prénom Nom** — Titre | email si trouvé | téléphone si trouvé | [LinkedIn](url ou lien de recherche) | 💬 angle d'approche en 1 phrase\`

Pièces à identifier :
- 🤴 Roi (Président)
- 👑 Reine (DG / Délégué Général) — décideur réel, priorité absolue
- 🐴 Cavalier (Dir. Partenariats / Relations membres / Communication)
- 🏰 Tour (DSI / Responsable IT / Responsable Numérique)
- ♟️ Pions (assistants, chargés de mission, secrétaire général — sources d'info)

Si une personne est introuvable, écris : \`[emoji] **Non identifié** — [Titre présumé] | [lien de recherche LinkedIn]\`
Regroupe TOUS les membres dans cette seule section, sans sous-titres intermédiaires.
Utilise en priorité les noms extraits du site web et de SIRENE.

### 🎯 Fit avec l'ICP AssoConnect
Évalue sur ces critères avec un score :
- Nombre de membres/contacts (cible : >200) : ✅/⚠️/❌
- Besoins probables (adhésions, CRM, compta, événements, dons) : liste les besoins identifiés
- Maturité digitale : ✅/⚠️/❌
- Capacité budgétaire estimée : ✅/⚠️/❌
- Potentiel réseau (fédération, associations membres) : ✅/⚠️/❌
- **Score ICP global : X/10**

### 📰 Contexte Actuel & Signaux
Couvre les points suivants si les données le permettent :

**Assemblées Générales :** date de la dernière AG, décisions clés prises, changements de gouvernance ou de stratégie annoncés.

**Enjeux & défis actuels :** problèmes identifiés (financement, digitalisation, recrutement, concurrence, réforme réglementaire), tensions internes si connues, besoins exprimés publiquement.

**Presse & articles récents :** résume les principaux articles ou mentions presse (titre, source, date approximative, contenu clé). Cite entre guillemets les formulations marquantes si disponibles dans le contenu du site.

**Signaux de croissance ou de changement :** nouveaux projets, partenariats, levées de fonds, recrutements, ouverture d'antennes, refonte du site, campagne de dons.

### ✅ Recommandation Finale
**Décision :** 🟢 À contacter immédiatement / 🟡 À investiguer davantage / 🔴 Hors ICP

**Justification :** (2-3 phrases max)

**Premier interlocuteur :** Prénom Nom, Titre, email/téléphone si disponible

**Angle d'approche :** Accroche personnalisée basée sur les spécificités de l'association

**Prochaine action :** Action concrète et immédiate

---

Sois factuel et précis. Indique clairement avec "(à vérifier)" quand une information est incertaine.
Ne fabrique jamais un email ou un téléphone — indique où le trouver si non disponible.`;

// ─── Web scraping helpers ────────────────────────────────────────────────────

function extractEmails(html: string): string[] {
  const matches = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  return [
    ...new Set(
      matches.filter(
        (e) =>
          !e.includes("example") &&
          !e.includes("@sentry") &&
          !e.endsWith(".png") &&
          !e.endsWith(".jpg") &&
          e.length < 80
      )
    ),
  ].slice(0, 20);
}

function extractPhones(html: string): string[] {
  const matches =
    html.match(
      /(?:(?:\+|00)33[\s.\-]?|0)[1-9](?:[\s.\-]?\d{2}){4}/g
    ) ?? [];
  return [...new Set(matches.map((p) => p.replace(/[\s.\-]/g, "")))].slice(0, 10);
}

function extractLinkedins(html: string): string[] {
  const matches = html.match(/linkedin\.com\/(?:in|company)\/[a-zA-Z0-9\-_%]+/g) ?? [];
  return [...new Set(matches.map((l) => "https://" + l))].slice(0, 10);
}

// Category labels for scraped pages — helps Claude interpret the content
const PAGE_CATEGORIES: { pattern: RegExp; label: string }[] = [
  { pattern: /bureau|conseil.admin|gouvernance|ca\b|board/i, label: "BUREAU / CONSEIL D'ADMINISTRATION" },
  { pattern: /equipe|team|direction|dirigeant|responsable|staff/i, label: "ÉQUIPE & DIRECTION" },
  { pattern: /contact|nous.contacter|contactez/i, label: "CONTACT" },
  { pattern: /section|antenne|club|delegation|region|territoire/i, label: "SECTIONS & ANTENNES" },
  { pattern: /adhes|membre|devenir.membre|rejoindre|inscription/i, label: "ADHÉSION & MEMBRES" },
  { pattern: /actualit|news|article|blog|communiqu|presse/i, label: "ACTUALITÉS & PRESSE" },
  { pattern: /agenda|evenement|calendrier|programme/i, label: "AGENDA & ÉVÉNEMENTS" },
  { pattern: /rapport|bilan|publication|document|chiffre/i, label: "RAPPORTS & PUBLICATIONS" },
  { pattern: /recrutement|emploi|offre|poste|carrieres/i, label: "RECRUTEMENT" },
  { pattern: /qui.sommes|presentation|histoire|mission|objet|a.propos|about/i, label: "PRÉSENTATION" },
];

function classifyPage(path: string, text: string): string {
  for (const { pattern, label } of PAGE_CATEGORIES) {
    if (pattern.test(path) || pattern.test(text.slice(0, 500))) return label;
  }
  return "PAGE DU SITE";
}

function extractInternalLinks(html: string, base: string): string[] {
  const hrefs = [...html.matchAll(/href=["']([^"'#?]+)["']/gi)].map((m) => m[1]);
  const keywords =
    /equipe|team|bureau|conseil|gouvernance|direction|contact|a-propos|about|membres|adherents|adhesion|section|antenne|club|actualit|news|agenda|evenement|recrutement|emploi|rapport|bilan|publication|presse|presentation|histoire|mission/i;

  return hrefs
    .filter((h) => keywords.test(h))
    .map((h) => {
      if (h.startsWith("http")) return h;
      if (h.startsWith("/")) return base + h;
      return base + "/" + h;
    })
    .filter((h) => h.startsWith(base))
    .slice(0, 20);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchRaw(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    return res.text();
  } catch {
    return null;
  }
}

interface ScrapeResult {
  pages: { url: string; label: string; text: string }[];
  emails: string[];
  phones: string[];
  linkedins: string[];
  resolvedUrl: string;
}

async function scrapeWebsite(rawUrl: string): Promise<ScrapeResult | null> {
  if (!rawUrl || rawUrl === "N/A") return null;

  // Normalise URL
  let base = rawUrl.trim();
  if (!base.startsWith("http")) base = "https://" + base;
  base = base.replace(/\/$/, "");

  // Fetch homepage
  const homepageHtml = await fetchRaw(base);
  if (!homepageHtml) {
    // Try www variant
    const alt = base.includes("://www.")
      ? base.replace("://www.", "://")
      : base.replace("://", "://www.");
    const altHtml = await fetchRaw(alt);
    if (!altHtml) return null;
    return scrapeFromHtml(alt, altHtml);
  }
  return scrapeFromHtml(base, homepageHtml);
}

async function scrapeFromHtml(base: string, homepageHtml: string): Promise<ScrapeResult> {
  const allEmails = extractEmails(homepageHtml);
  const allPhones = extractPhones(homepageHtml);
  const allLinkedins = extractLinkedins(homepageHtml);

  const internalLinks = extractInternalLinks(homepageHtml, base);

  // Fixed paths grouped by priority — covers the most common French asso URL patterns
  const fixedPaths = [
    // Bureau / gouvernance
    "/bureau", "/conseil-administration", "/conseil-d-administration",
    "/gouvernance", "/ca", "/board", "/instances",
    // Équipe / direction
    "/equipe", "/team", "/direction", "/dirigeants", "/responsables",
    "/nos-elus", "/elus",
    // Contact
    "/contact", "/nous-contacter", "/contactez-nous", "/coordonnees",
    // Présentation
    "/qui-sommes-nous", "/a-propos", "/presentation", "/histoire",
    "/notre-association", "/about",
    // Sections / antennes
    "/nos-sections", "/sections", "/clubs", "/antennes",
    "/delegations", "/regions", "/territoires",
    // Adhésion / membres
    "/adhesion", "/adherer", "/devenir-membre", "/nos-membres",
    "/membres", "/rejoindre", "/inscription",
    // Actualités / presse
    "/actualites", "/actualite", "/news", "/presse",
    "/communiques-de-presse", "/articles", "/blog",
    // Agenda / événements
    "/agenda", "/evenements", "/calendrier", "/programme",
    // Rapports & chiffres
    "/rapport-annuel", "/bilan", "/publications", "/documents",
    "/chiffres-cles",
    // Recrutement
    "/recrutement", "/emploi", "/offres-emploi",
  ];

  const allUrls = [
    ...new Set([...internalLinks, ...fixedPaths.map((p) => base + p)]),
  ].slice(0, 30);

  // Fetch all secondary pages in parallel
  const secondaryHtmls = await Promise.all(
    allUrls.map((url) => fetchRaw(url, 4000).then((html) => ({ url, html })))
  );

  const homepageText = stripHtml(homepageHtml).slice(0, 4000);
  const pages: { url: string; label: string; text: string }[] = [
    { url: base, label: "PAGE D'ACCUEIL", text: homepageText },
  ];

  for (const { url, html } of secondaryHtmls) {
    if (!html || html.length < 300) continue;
    allEmails.push(...extractEmails(html));
    allPhones.push(...extractPhones(html));
    allLinkedins.push(...extractLinkedins(html));
    const path = url.replace(base, "") || "/";
    const text = stripHtml(html).slice(0, 3000);
    const label = classifyPage(path, text);
    pages.push({ url: path, label, text });
  }

  return {
    pages: pages.slice(0, 20),
    emails: [...new Set(allEmails)].slice(0, 30),
    phones: [...new Set(allPhones)].slice(0, 15),
    linkedins: [...new Set(allLinkedins)].slice(0, 15),
    resolvedUrl: base,
  };
}

async function guessWebsiteUrl(name: string): Promise<string | null> {
  // Try common URL patterns for French associations
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const candidates = [
    `https://www.${slug}.fr`,
    `https://www.${slug}.org`,
    `https://${slug}.fr`,
    `https://www.${slug}.asso.fr`,
    `https://${slug}.asso.fr`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (res.ok) return url;
    } catch {
      // try next
    }
  }
  return null;
}

// ─── Public API helpers ──────────────────────────────────────────────────────

async function searchSirene(name: string) {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}&per_page=3&minimal=false`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function searchRNA(name: string) {
  try {
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/rna/v1/full_text/${encodeURIComponent(name)}?per_page=3`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Dirigeant = { prenom?: string; nom?: string; qualite?: string };

// ─── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name: string };
  if (!name?.trim()) {
    return Response.json({ error: "Nom d'association requis" }, { status: 400 });
  }

  // Fetch public data + guess website URL all in parallel from the start
  const [sireneData, rnaData, guessedUrl] = await Promise.all([
    searchSirene(name.trim()),
    searchRNA(name.trim()),
    guessWebsiteUrl(name.trim()),
  ]);

  const publicContext: string[] = [];
  let siteUrl = "";

  if (sireneData?.results?.length) {
    const top = sireneData.results[0];
    const asso = top.association ?? {};
    siteUrl = asso.site_web ?? "";

    const dirigeants = (top.dirigeants ?? []) as Dirigeant[];
    const dirigeantsText = dirigeants.length
      ? dirigeants
          .map((d) => `  - ${[d.prenom, d.nom].filter(Boolean).join(" ")} — ${d.qualite ?? "N/A"}`)
          .join("\n")
      : "  - Aucun dirigeant trouvé dans le registre INPI";

    publicContext.push(`**SIRENE** — ${top.nom_complet} (SIREN: ${top.siren})
- Forme juridique : ${top.nature_juridique ?? "N/A"}
- Siège : ${top.siege?.libelle_commune ?? "N/A"} (${top.siege?.code_postal ?? ""})
- Objet social : ${asso.objet ?? "N/A"}
- Date création : ${asso.date_creation ?? top.date_creation ?? "N/A"}
- Site web (SIRENE) : ${siteUrl || "non renseigné"}
- Email association : ${asso.email ?? "N/A"}
- Téléphone association : ${asso.telephone ?? "N/A"}
- Dirigeants déclarés (INPI) :
${dirigeantsText}`);
  }

  if (rnaData?.association) {
    const a = rnaData.association;
    if (!siteUrl && a.site_web) siteUrl = a.site_web;
    publicContext.push(`**RNA** — ${a.id_association ?? "N/A"}
- Objet : ${a.objet ?? "N/A"}
- Adresse : ${a.adresse_siege?.voie ?? ""} ${a.adresse_siege?.code_postal ?? ""} ${a.adresse_siege?.commune ?? ""}
- Agrément : ${JSON.stringify(a.agrement ?? "aucun")}`);
  } else if (rnaData?.associations?.length) {
    const top = rnaData.associations[0];
    if (!siteUrl && top.site_web) siteUrl = top.site_web;
    publicContext.push(`**RNA** — ${top.id_association ?? "N/A"}
- Titre : ${top.titre ?? "N/A"}
- Objet : ${top.objet ?? "N/A"}`);
  }

  // Use guessed URL as fallback if public APIs didn't provide one
  if (!siteUrl && guessedUrl) siteUrl = guessedUrl;

  // Scrape website
  const scrape = siteUrl ? await scrapeWebsite(siteUrl) : null;

  // Build website section for the prompt
  let websiteSection = "## Site web\nNon trouvé dans les données publiques.";
  if (scrape) {
    const contactsFound = [
      scrape.emails.length ? `Emails trouvés : ${scrape.emails.join(", ")}` : null,
      scrape.phones.length ? `Téléphones trouvés : ${scrape.phones.join(", ")}` : null,
      scrape.linkedins.length ? `Profils LinkedIn trouvés : ${scrape.linkedins.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const pagesText = scrape.pages
      .map((p) => `### [${p.label}] ${p.url}\n${p.text}`)
      .join("\n\n---\n\n");

    websiteSection = `## Site web — ${scrape.resolvedUrl}
(${scrape.pages.length} pages explorées : ${scrape.pages.map((p) => p.label).join(", ")})

### Contacts extraits automatiquement du HTML :
${contactsFound || "Aucun contact extrait directement"}

### Contenu des pages :
${pagesText.slice(0, 20000)}`;
  } else if (siteUrl) {
    websiteSection = `## Site web\nURL détectée : ${siteUrl} (contenu non accessible)`;
  }

  const userMessage = `Préqualifie l'association : **"${name}"**

${publicContext.length > 0 ? `## Données publiques (SIRENE / RNA)\n${publicContext.join("\n\n")}` : "Aucune donnée publique trouvée via les APIs gouvernementales. Utilise tes connaissances générales."}

${websiteSection}

Produis maintenant la fiche de préqualification complète.
Pour l'organigramme, utilise EN PRIORITÉ les noms et coordonnées extraits du site web et de SIRENE.
Les emails et téléphones listés dans "Contacts extraits automatiquement" sont réels — attribue-les aux bonnes personnes selon le contexte.`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
