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
Identifie les pièces clés selon la Chess Methodology :
- 🤴 **Le Roi** (Président) — légitimité, rarement le décideur final
- 👑 **La Reine** (DG / Délégué Général) — décideur réel, priorité absolue
- 🐴 **Le Cavalier** (Dir. Partenariats / Relations membres) — champion potentiel
- 🏰 **La Tour** (DSI / Responsable IT) — peut avoir un droit de veto
- ♟️ **Les Pions** (assistants, chargés de mission) — sources d'information précieuses

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

**Premier interlocuteur :** Prénom Nom, Titre — comment le trouver/contacter

**Angle d'approche :** Accroche personnalisée basée sur les spécificités de l'association

**Prochaine action :** Action concrète et immédiate

---

Sois factuel et précis. Indique clairement avec "(à vérifier)" quand une information est incertaine.
Utilise les données publiques fournies comme point de départ, et complète avec tes connaissances générales sur l'association.`;

async function searchSirene(name: string) {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}&per_page=3&minimal=false`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function searchRNA(name: string) {
  try {
    const encoded = encodeURIComponent(name);
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/rna/v1/full_text/${encoded}?per_page=3`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name: string };
  if (!name?.trim()) {
    return Response.json({ error: "Nom d'association requis" }, { status: 400 });
  }

  const [sireneData, rnaData] = await Promise.all([
    searchSirene(name.trim()),
    searchRNA(name.trim()),
  ]);

  const publicContext = [];
  if (sireneData?.results?.length) {
    const top = sireneData.results[0];
    const asso = top.association ?? {};
    publicContext.push(`**SIRENE** — ${top.nom_complet} (SIREN: ${top.siren})
- Forme juridique : ${top.nature_juridique ?? "N/A"}
- Siège : ${top.siege?.libelle_commune ?? "N/A"} (${top.siege?.code_postal ?? ""})
- Objet social : ${asso.objet ?? "N/A"}
- Date création : ${asso.date_creation ?? top.date_creation ?? "N/A"}
- Site web : ${asso.site_web ?? "N/A"}
- Email : ${asso.email ?? "N/A"}
- Téléphone : ${asso.telephone ?? "N/A"}
- Dirigeants : ${(top.dirigeants ?? []).slice(0, 3).map((d: { prenom?: string; nom?: string; qualite?: string }) => `${d.prenom ?? ""} ${d.nom ?? ""} (${d.qualite ?? ""})`).join(", ") || "N/A"}`);
  }

  if (rnaData?.association) {
    const a = rnaData.association;
    publicContext.push(`**RNA** — RNA: ${a.id_association ?? "N/A"}
- Titre : ${a.titre ?? "N/A"}
- Objet : ${a.objet ?? "N/A"}
- Adresse : ${a.adresse_siege?.voie ?? ""} ${a.adresse_siege?.code_postal ?? ""} ${a.adresse_siege?.commune ?? ""}
- Agrément : ${JSON.stringify(a.agrement ?? "aucun")}`);
  } else if (rnaData?.associations?.length) {
    const top = rnaData.associations[0];
    publicContext.push(`**RNA** — RNA: ${top.id_association ?? "N/A"}
- Titre : ${top.titre ?? "N/A"}
- Objet : ${top.objet ?? "N/A"}`);
  }

  const userMessage = `Préqualifie l'association : **"${name}"**

${publicContext.length > 0 ? `Données publiques trouvées :\n${publicContext.join("\n\n")}` : "Aucune donnée publique trouvée via les APIs. Utilise tes connaissances générales."}

Produis maintenant la fiche de préqualification complète selon le format demandé.`;

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
