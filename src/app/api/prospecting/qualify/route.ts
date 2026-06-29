import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Tu es QualifBot, un assistant de préqualification commerciale expert pour AssoConnect.
Tu aides les Account Executives à évaluer rapidement des associations françaises prospect (en moins de 10 minutes).

AssoConnect est un logiciel SaaS tout-en-un pour associations : adhésions, CRM membres, comptabilité, événements, dons en ligne.
L'ICP (Ideal Customer Profile) cible des associations avec plus de 200 membres, ayant des besoins de gestion numérique.

Pour chaque association donnée, produis une fiche de préqualification COMPLÈTE en markdown structuré.

## Format attendu (respecte exactement cette structure) :

### 🏛️ Mission & Organisation
- **Mission :** phrase précise décrivant l'objet social (source entre parenthèses)
- **Structure :** réseau national / fédération / association locale / multi-antennes
- **Membres/adhérents :** nombre exact ou fourchette (source)
- **Sections/antennes :** nombre et répartition géographique (source)
- **Salariés :** nombre ou tranche (source : SIRENE, RNA ou site web)
- **Bénévoles :** nombre si trouvé (source)
- **Budget annuel :** montant ou estimation (source)
- **Ancienneté :** année de création

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

  const homepageText = stripHtml(homepageHtml).slice(0, 6000);
  const pages: { url: string; label: string; text: string }[] = [
    { url: base, label: "PAGE D'ACCUEIL", text: homepageText },
  ];

  for (const { url, html } of secondaryHtmls) {
    if (!html || html.length < 300) continue;
    allEmails.push(...extractEmails(html));
    allPhones.push(...extractPhones(html));
    allLinkedins.push(...extractLinkedins(html));
    const path = url.replace(base, "") || "/";
    const text = stripHtml(html).slice(0, 5000);
    const label = classifyPage(path, text);
    pages.push({ url: path, label, text });
  }

  return {
    pages: pages.slice(0, 25),
    emails: [...new Set(allEmails)].slice(0, 30),
    phones: [...new Set(allPhones)].slice(0, 15),
    linkedins: [...new Set(allLinkedins)].slice(0, 15),
    resolvedUrl: base,
  };
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Generate multiple slug candidates from a long name by taking meaningful word subsets.
// e.g. "Assoc Nationale des Hospitaliers Retraites" → ["hospitaliers-retraites", "assoc-nationale-des-hospitaliers-retraites", ...]
function slugVariants(name: string): string[] {
  const stopwords = new Set([
    "association", "assoc", "nationale", "national", "france", "français", "francais",
    "des", "de", "du", "les", "la", "le", "un", "une", "et", "ou", "en", "au", "aux",
    "pour", "par", "sur", "dans", "avec", "qui", "que", "tout", "toute", "tous",
    "federation", "federation", "fédération", "union", "syndicat", "comite", "comité",
    "ligue", "groupement", "collectif", "mouvement", "reseau", "réseau",
  ]);
  const full = toSlug(name).slice(0, 60);
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));

  const variants: string[] = [full];
  if (words.length >= 2) variants.push(words.join("-").slice(0, 60));
  if (words.length >= 2) variants.push(words.slice(-2).join("-"));
  if (words.length >= 3) variants.push(words.slice(-3).join("-"));
  if (words.length >= 2) variants.push(words.slice(0, 2).join("-"));

  return [...new Set(variants)].filter(Boolean).slice(0, 5);
}

async function guessWebsiteUrl(name: string): Promise<string | null> {
  const slugs = slugVariants(name);
  const candidates: string[] = [];
  for (const slug of slugs) {
    candidates.push(
      `https://www.${slug}.fr`,
      `https://${slug}.fr`,
      `https://www.${slug}.org`,
      `https://www.${slug}.asso.fr`,
      `https://${slug}.asso.fr`,
      `https://${slug}.org`,
      `https://www.${slug}.com`,
    );
  }

  // Try all candidates in parallel — return first that responds
  const results = await Promise.allSettled(
    candidates.map((url) =>
      fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
      }).then((res) => (res.ok ? url : null))
    )
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }
  return null;
}

async function searchWebForUrl(name: string): Promise<string | null> {
  // DuckDuckGo HTML — no API key needed, returns real search results
  const BLOCKED_HOSTS = [
    "duckduckgo.com", "google.com", "bing.com", "yahoo.com",
    "wikipedia.org", "linkedin.com", "facebook.com", "twitter.com",
    "youtube.com", "instagram.com", "societe.com", "pappers.fr",
    "data.gouv.fr", "legifrance.gouv.fr",
  ];

  try {
    const q = encodeURIComponent(`"${name}" association site officiel`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // DuckDuckGo encodes result URLs in uddg= query param
    const matches = [...html.matchAll(/uddg=(https?%3A%2F%2F[^&"'\s]+)/g)];
    const urls = matches
      .map((m) => {
        try { return decodeURIComponent(m[1]); } catch { return null; }
      })
      .filter((u): u is string =>
        u !== null &&
        !BLOCKED_HOSTS.some((h) => u.includes(h))
      );

    if (urls[0]) return urls[0];

    // Fallback: look for plain href links in the results
    const hrefMatches = [...html.matchAll(/href="(https?:\/\/(?!(?:duckduckgo)[^"]+)[^"]+)"/g)];
    const hrefUrls = hrefMatches
      .map((m) => m[1])
      .filter((u) => !BLOCKED_HOSTS.some((h) => u.includes(h)));

    return hrefUrls[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Public API helpers ──────────────────────────────────────────────────────

const SIRENE_EFFECTIF: Record<string, string> = {
  "00": "0 salarié", "01": "1-2", "02": "3-5", "03": "6-9",
  "11": "10-19", "12": "20-49", "21": "50-99", "22": "100-199",
  "31": "200-249", "32": "250-499", "41": "500-999", "42": "1 000-1 999",
  "51": "2 000-4 999", "52": "5 000-9 999", "53": "10 000+",
};

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

async function fetchRnaDetail(rnaId: string) {
  try {
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/rna/v1/id/${encodeURIComponent(rnaId)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
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

  // All sources run in parallel from the start
  const [sireneData, rnaData, guessedUrl, searchedUrl] = await Promise.all([
    searchSirene(name.trim()),
    searchRNA(name.trim()),
    guessWebsiteUrl(name.trim()),
    searchWebForUrl(name.trim()),
  ]);

  const publicContext: string[] = [];
  let siteUrl = "";
  let rnaId: string | null = null;

  if (sireneData?.results?.length) {
    const top = sireneData.results[0];
    const asso = top.association ?? {};
    siteUrl = asso.site_web ?? "";
    if (asso.id_association) rnaId = asso.id_association;

    const dirigeants = (top.dirigeants ?? []) as Dirigeant[];
    const dirigeantsText = dirigeants.length
      ? dirigeants
          .map((d) => `  - ${[d.prenom, d.nom].filter(Boolean).join(" ")} — ${d.qualite ?? "N/A"}`)
          .join("\n")
      : "  - Aucun dirigeant trouvé dans le registre INPI";

    const effectifCode = top.tranche_effectif_salarie ?? top.siege?.tranche_effectif_salarie;
    const effectif = effectifCode ? SIRENE_EFFECTIF[effectifCode] ?? effectifCode : "non renseigné";

    publicContext.push(`**SIRENE** — ${top.nom_complet} (SIREN: ${top.siren})
- Forme juridique : ${top.nature_juridique ?? "N/A"}
- Siège : ${top.siege?.libelle_commune ?? "N/A"} (${top.siege?.code_postal ?? ""}) — département ${top.siege?.departement ?? "N/A"}
- Objet social : ${asso.objet ?? "N/A"}
- Date création : ${asso.date_creation ?? top.date_creation ?? "N/A"}
- Effectif salarié (tranche SIRENE) : ${effectif} salariés
- Site web (SIRENE) : ${siteUrl || "non renseigné"}
- Email association : ${asso.email ?? "N/A"}
- Téléphone association : ${asso.telephone ?? "N/A"}
- Agrément : ${asso.agrement?.[0]?.type ?? "aucun"}
- Dirigeants déclarés (INPI) :
${dirigeantsText}`);
  }

  // Fetch RNA detail in parallel with first result extraction
  const rnaTopId =
    rnaId ??
    rnaData?.association?.id_association ??
    rnaData?.associations?.[0]?.id_association ??
    null;

  const rnaDetail = rnaTopId ? await fetchRnaDetail(rnaTopId) : null;
  const rnaRecord = rnaDetail?.association ?? rnaData?.association ?? rnaData?.associations?.[0] ?? null;

  if (rnaRecord) {
    if (!siteUrl && rnaRecord.site_web) siteUrl = rnaRecord.site_web;
    publicContext.push(`**RNA** — ${rnaRecord.id_association ?? "N/A"}
- Titre officiel : ${rnaRecord.titre ?? "N/A"}
- Objet complet : ${rnaRecord.objet ?? "N/A"}
- Adresse siège : ${rnaRecord.adresse_siege?.voie ?? ""} ${rnaRecord.adresse_siege?.code_postal ?? ""} ${rnaRecord.adresse_siege?.commune ?? ""}
- Site web (RNA) : ${rnaRecord.site_web ?? "N/A"}
- Email RNA : ${rnaRecord.email ?? "N/A"}
- Téléphone RNA : ${rnaRecord.telephone ?? "N/A"}
- Agrément : ${JSON.stringify(rnaRecord.agrement ?? "aucun")}
- Nb adhérents déclarés : ${rnaRecord.nb_adherents ?? rnaRecord.nombre_adherents ?? "N/A"}
- Nb bénévoles déclarés : ${rnaRecord.nb_benevoles ?? rnaRecord.nombre_benevoles ?? "N/A"}
- Nb salariés déclarés : ${rnaRecord.nb_salaries ?? rnaRecord.nombre_salaries ?? "N/A"}
- Date dernière déclaration : ${rnaRecord.date_mise_a_jour ?? rnaRecord.date_derniere_mise_a_jour ?? "N/A"}`);
  }

  // Priority: SIRENE/RNA (official) > pattern guess > web search
  if (!siteUrl && guessedUrl) siteUrl = guessedUrl;
  if (!siteUrl && searchedUrl) siteUrl = searchedUrl;

  // Phase 2: if still no URL, retry using the full SIRENE/RNA name (not just user acronym)
  if (!siteUrl) {
    const fullSireneName: string = sireneData?.results?.[0]?.nom_complet ?? "";
    const fullRnaName: string = rnaRecord?.titre ?? "";
    const fullName = fullSireneName || fullRnaName;
    if (fullName && fullName.toLowerCase() !== name.trim().toLowerCase()) {
      const objetWords = (sireneData?.results?.[0]?.association?.objet ?? rnaRecord?.objet ?? "")
        .split(/\s+/)
        .filter((w: string) => w.length > 5)
        .slice(0, 3)
        .join(" ");
      const [g2, s2, s3] = await Promise.all([
        guessWebsiteUrl(fullName),
        searchWebForUrl(fullName),
        objetWords ? searchWebForUrl(`${fullName} ${objetWords}`) : Promise.resolve(null),
      ]);
      siteUrl = g2 ?? s2 ?? s3 ?? "";
    }
  }

  // Scrape website — generous limits for thorough analysis
  const scrape = siteUrl ? await scrapeWebsite(siteUrl) : null;

  // Build website section
  let websiteSection = "## Site web\nNon trouvé — utilise tes connaissances générales sur cette association.";
  if (scrape) {
    const contactsFound = [
      scrape.emails.length ? `Emails : ${scrape.emails.join(", ")}` : null,
      scrape.phones.length ? `Téléphones : ${scrape.phones.join(", ")}` : null,
      scrape.linkedins.length ? `LinkedIn : ${scrape.linkedins.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const pagesText = scrape.pages
      .map((p) => `### [${p.label}] ${p.url}\n${p.text}`)
      .join("\n\n---\n\n");

    websiteSection = `## Site web — ${scrape.resolvedUrl}
Pages explorées (${scrape.pages.length}) : ${scrape.pages.map((p) => p.label).join(" | ")}

### Contacts extraits du HTML :
${contactsFound || "Aucun contact extrait"}

### Contenu intégral des pages :
${pagesText.slice(0, 28000)}`;
  } else if (siteUrl) {
    websiteSection = `## Site web\nURL : ${siteUrl} (non accessible au scraping)`;
  }

  const userMessage = `Préqualifie l'association : **"${name}"**

${publicContext.length > 0 ? `## Données officielles (SIRENE / RNA)\n${publicContext.join("\n\n")}` : "Aucune donnée publique trouvée. Utilise tes connaissances générales."}

${websiteSection}

---
## Instructions de rédaction

Produis la fiche de préqualification complète.

**Pour chaque donnée chiffrée, cite ta source entre parenthèses** : (SIRENE), (RNA), (site web /page), (estimation).
Si une donnée est introuvable, écris "Non trouvé" — ne l'invente pas.

**Points à creuser en priorité dans le contenu du site web :**
- Nombre exact de membres/adhérents (cherche dans /adhesion, /chiffres-cles, page d'accueil, rapports)
- Nombre de sections/antennes/clubs (cherche dans /sections, /antennes, /carte, menus de navigation)
- Nombre de salariés / bénévoles (cherche dans pages RH, rapports d'activité, pages "qui sommes-nous")
- Mission précise et valeurs (cherche dans /presentation, /mission, /qui-sommes-nous)
- Actualités récentes datées (titres et dates des derniers articles/communiqués)
- Coordonnées directes : email général, téléphone, adresse complète

**Pour l'organigramme :**
Les emails et téléphones extraits du HTML sont réels — attribue-les aux bonnes personnes selon le contexte (nom sur la même page, signature, page contact).`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
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
