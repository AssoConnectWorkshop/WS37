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
Pour CHAQUE pièce, indique :
- Le **nom complet** de la personne (ou "Inconnu" si non trouvé)
- Son **titre exact**
- Son **email** si trouvé dans les données publiques ou sur le site web (sinon indique où le chercher)
- Son **téléphone** si trouvé (sinon indique où le chercher)
- Son profil **LinkedIn** si connu ou un lien de recherche suggéré
- Une note sur comment l'approcher

Structure :
- 🤴 **Le Roi** (Président) — légitimité, rarement le décideur final
- 👑 **La Reine** (DG / Délégué Général) — décideur réel, priorité absolue
- 🐴 **Le Cavalier** (Dir. Partenariats / Relations membres) — champion potentiel
- 🏰 **La Tour** (DSI / Responsable IT) — peut avoir un droit de veto
- ♟️ **Les Pions** (assistants, chargés de mission) — sources d'information précieuses

IMPORTANT : Utilise en priorité les données extraites du site web et de SIRENE pour les noms réels.
Si un contact n'est pas trouvé, propose une URL de recherche LinkedIn du type :
https://www.linkedin.com/search/results/people/?keywords=[Prénom+Nom]+[Association]

### 🎯 Fit avec l'ICP AssoConnect
Évalue sur ces critères avec un score :
- Nombre de membres/contacts (cible : >200) : ✅/⚠️/❌
- Besoins probables (adhésions, CRM, compta, événements, dons) : liste les besoins identifiés
- Maturité digitale : ✅/⚠️/❌
- Capacité budgétaire estimée : ✅/⚠️/❌
- Potentiel réseau (fédération, associations membres) : ✅/⚠️/❌
- **Score ICP global : X/10**

### 📰 Actualités & Signaux Récents
Liste les événements récents (AG, projets, partenariats, levées de fonds), les signaux de croissance ou de changement, et les défis/problèmes connus.

### ✅ Recommandation Finale
**Décision :** 🟢 À contacter immédiatement / 🟡 À investiguer davantage / 🔴 Hors ICP

**Justification :** (2-3 phrases max)

**Premier interlocuteur :** Prénom Nom, Titre, email/téléphone si disponible

**Angle d'approche :** Accroche personnalisée basée sur les spécificités de l'association

**Prochaine action :** Action concrète et immédiate

---

Sois factuel et précis. Indique clairement avec "(à vérifier)" quand une information est incertaine.
Ne fabrique jamais un email ou un téléphone — indique où le trouver si non disponible.`;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchPage(url: string, timeoutMs = 4000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; QualifBot/1.0)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return stripHtml(html).slice(0, 6000);
  } catch {
    return null;
  }
}

async function scrapeWebsite(siteUrl: string): Promise<string> {
  if (!siteUrl || siteUrl === "N/A") return "";

  const base = siteUrl.replace(/\/$/, "");
  const contactPaths = ["/equipe", "/team", "/qui-sommes-nous", "/gouvernance", "/bureau", "/contact", "/a-propos", "/about"];

  const pages = await Promise.all([
    fetchPage(base),
    ...contactPaths.map((p) => fetchPage(base + p, 3000)),
  ]);

  const combined = pages
    .filter((p): p is string => p !== null && p.length > 100)
    .map((p, i) => `[Page ${i === 0 ? "accueil" : contactPaths[i - 1]}]\n${p}`)
    .join("\n\n---\n\n");

  return combined.slice(0, 15000);
}

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

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name: string };
  if (!name?.trim()) {
    return Response.json({ error: "Nom d'association requis" }, { status: 400 });
  }

  const [sireneData, rnaData] = await Promise.all([
    searchSirene(name.trim()),
    searchRNA(name.trim()),
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
      : "  - Aucun dirigeant trouvé";

    publicContext.push(`**SIRENE** — ${top.nom_complet} (SIREN: ${top.siren})
- Forme juridique : ${top.nature_juridique ?? "N/A"}
- Siège : ${top.siege?.libelle_commune ?? "N/A"} (${top.siege?.code_postal ?? ""})
- Objet social : ${asso.objet ?? "N/A"}
- Date création : ${asso.date_creation ?? top.date_creation ?? "N/A"}
- Site web : ${siteUrl || "N/A"}
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
    publicContext.push(`**RNA** — ${top.id_association ?? "N/A"}
- Titre : ${top.titre ?? "N/A"}
- Objet : ${top.objet ?? "N/A"}`);
  }

  const websiteContent = siteUrl ? await scrapeWebsite(siteUrl) : "";

  const userMessage = `Préqualifie l'association : **"${name}"**

${publicContext.length > 0 ? `## Données publiques (SIRENE / RNA)\n${publicContext.join("\n\n")}` : "Aucune donnée publique trouvée via les APIs. Utilise tes connaissances générales."}

${websiteContent ? `## Contenu extrait du site web (${siteUrl})\n${websiteContent}` : siteUrl ? `## Site web détecté : ${siteUrl}\n(Contenu non accessible)` : "## Site web : non disponible dans les données publiques"}

Produis maintenant la fiche de préqualification complète. Pour l'organigramme, utilise les noms réels trouvés dans les données SIRENE et le site web. Indique emails et téléphones trouvés, ou une piste concrète pour les obtenir.`;

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
