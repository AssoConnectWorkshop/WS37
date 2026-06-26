import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Radius = "department" | "region" | "national";

interface SimilarResult {
  nom: string;
  rna: string | null;
  siren: string | null;
  ville: string | null;
  departement: string | null;
  codePostal: string | null;
  objetSocial: string | null;
  raisonSuggestion: string;
  scoreIcp: "fort" | "moyen" | "faible";
  secteur: string;
}

interface SimilarResponse {
  associations: SimilarResult[];
}

async function getSireneDetails(name: string) {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}&per_page=1&minimal=false`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.results?.[0] ?? null;
  } catch {
    return null;
  }
}

async function searchSireneByApe(codeApe: string, departement: string | null, region: string | null, radius: Radius, limit: number) {
  try {
    let url = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${encodeURIComponent(codeApe)}&per_page=${Math.min(limit * 3, 50)}&minimal=false`;
    if (radius === "department" && departement) url += `&departement=${departement}`;
    else if (radius === "region" && region) url += `&region=${region}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

async function searchRnaByKeywords(keywords: string[], departement: string | null, radius: Radius, limit: number) {
  const query = keywords.slice(0, 3).join(" ");
  if (!query) return [];
  try {
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/rna/v1/full_text/${encodeURIComponent(query)}?per_page=${Math.min(limit * 3, 50)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list = json.association
      ? [json.association]
      : Array.isArray(json.associations)
      ? json.associations
      : [];

    if (radius === "national" || !departement) return list;

    return list.filter((a: { adresse_siege?: { code_postal?: string } }) => {
      const cp = a.adresse_siege?.code_postal ?? "";
      if (radius === "department") return cp.startsWith(departement);
      return true;
    });
  } catch {
    return [];
  }
}

function extractKeywords(objetSocial: string): string[] {
  const stopwords = new Set([
    "et", "ou", "de", "du", "des", "les", "la", "le", "un", "une", "pour",
    "en", "au", "aux", "par", "sur", "dans", "avec", "qui", "que", "tout",
    "toute", "tous", "ses", "son", "leur", "leurs", "ces", "l", "d", "à",
    "promotion", "développement", "association", "organisation", "activités",
  ]);
  return objetSocial
    .toLowerCase()
    .replace(/[^a-zàâäéèêëîïôùûüç\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopwords.has(w))
    .slice(0, 5);
}

type SireneResult = {
  nom_complet?: string;
  siren?: string;
  siege?: { libelle_commune?: string; departement?: string; code_postal?: string };
  association?: { objet?: string; id_association?: string; site_web?: string };
  nature_juridique?: string;
  activite_principale?: string;
};

type RnaResult = {
  titre?: string;
  id_association?: string;
  objet?: string;
  adresse_siege?: { commune?: string; code_postal?: string };
};

export async function POST(req: Request) {
  const { name, radius = "department", limit = 5, excludeName } = (await req.json()) as {
    name: string;
    radius?: Radius;
    limit?: number;
    excludeName?: string;
  };

  if (!name?.trim()) {
    return Response.json({ error: "Nom requis" }, { status: 400 });
  }

  const baseAssociation = await getSireneDetails(name.trim());

  const codeApe = baseAssociation?.activite_principale ?? baseAssociation?.siege?.activite_principale ?? null;
  const departement = baseAssociation?.siege?.departement ?? null;
  const region = baseAssociation?.siege?.region ?? null;
  const objetSocial = baseAssociation?.association?.objet ?? "";
  const keywords = extractKeywords(objetSocial || name);

  const [sireneResults, rnaResults] = await Promise.all([
    codeApe
      ? searchSireneByApe(codeApe, departement, region, radius, limit)
      : Promise.resolve([]),
    searchRnaByKeywords(keywords, departement, radius, limit),
  ]);

  const seen = new Set<string>();
  const excludeNorm = (excludeName ?? name).toLowerCase();

  const candidates: string[] = [];

  for (const r of sireneResults as SireneResult[]) {
    const n = r.nom_complet ?? "";
    const key = r.siren ?? n;
    if (!n || seen.has(key)) continue;
    if (n.toLowerCase().includes(excludeNorm.slice(0, 10))) continue;
    seen.add(key);
    candidates.push(
      `[SIRENE] ${n} | SIREN: ${r.siren ?? "N/A"} | ${r.siege?.libelle_commune ?? "N/A"} (${r.siege?.departement ?? ""}) | APE: ${r.activite_principale ?? ""} | Objet: ${r.association?.objet?.slice(0, 120) ?? "N/A"}`
    );
  }

  for (const r of rnaResults as RnaResult[]) {
    const n = r.titre ?? "";
    const key = r.id_association ?? n;
    if (!n || seen.has(key)) continue;
    if (n.toLowerCase().includes(excludeNorm.slice(0, 10))) continue;
    seen.add(key);
    candidates.push(
      `[RNA] ${n} | RNA: ${r.id_association ?? "N/A"} | ${r.adresse_siege?.commune ?? "N/A"} (${r.adresse_siege?.code_postal?.slice(0, 2) ?? ""}) | Objet: ${r.objet?.slice(0, 120) ?? "N/A"}`
    );
  }

  if (candidates.length === 0) {
    return Response.json({ associations: [] });
  }

  const systemPrompt = `Tu es un expert en prospection commerciale pour AssoConnect, logiciel SaaS pour associations françaises.

ICP AssoConnect :
- Association loi 1901 en France
- Entre 1 et 50 salariés (ETPT) OU 50+ adhérents actifs
- Budget entre 30 000 € et 2 000 000 €
- Secteurs : sport, culture, éducation, social, environnement, jeunesse, professionnel
- Besoins : adhérents, comptabilité, dons, subventions, événements, communication
- Signaux positifs : subventions publiques, événements récurrents, bénévoles + salariés, digitalisation
- Signaux négatifs : budget < 10 000 €, pas de permanent, mono-projet, objet trop vague

Retourne UNIQUEMENT un JSON valide avec ce schéma exact (aucun texte autour) :
{
  "associations": [
    {
      "nom": "string",
      "rna": "string ou null",
      "siren": "string ou null",
      "ville": "string ou null",
      "departement": "string ou null",
      "codePostal": "string ou null",
      "objetSocial": "string (1 phrase max)",
      "raisonSuggestion": "string (1 phrase : pourquoi similaire)",
      "scoreIcp": "fort" | "moyen" | "faible",
      "secteur": "string (1 mot : Sport / Culture / Social / Éducation / Environnement / Jeunesse / Professionnel / Autre)"
    }
  ]
}`;

  const userMessage = `Association analysée : "${name}"
Secteur de référence : ${codeApe ?? "non connu"}, Objet : ${objetSocial?.slice(0, 200) || "non connu"}
Département : ${departement ?? "non connu"}

Candidats trouvés (${candidates.length}) :
${candidates.join("\n")}

Sélectionne et évalue les ${limit} meilleures associations similaires selon l'ICP AssoConnect.
Exclure les associations dissoutes, trop petites, ou à objet trop vague.
Retourne exactement ${limit} associations (ou moins si les candidats ne suffisent pas).`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return Response.json({ associations: [] });

    const parsed = JSON.parse(match[0]) as SimilarResponse;
    return Response.json(parsed);
  } catch {
    return Response.json({ associations: [] });
  }
}
