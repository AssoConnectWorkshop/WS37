import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const siren = req.nextUrl.searchParams.get("siren")?.replace(/\s/g, "");
  if (!siren || !/^\d{9,14}$/.test(siren)) {
    return NextResponse.json({ error: "SIREN/SIRET invalide" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1&minimal=false`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`API status ${res.status}`);
    const json = await res.json();
    const result = json.results?.[0];
    if (!result) {
      return NextResponse.json({ error: "Aucune association trouvée pour ce numéro" }, { status: 404 });
    }

    const siege = result.siege ?? {};
    const dirigeants = result.dirigeants ?? [];
    const asso = result.association ?? {};
    const representant = dirigeants.find((d: { qualite?: string }) =>
      ["Président", "Directeur", "Gérant"].some((q) => d.qualite?.includes(q))
    ) ?? dirigeants[0];

    return NextResponse.json({
      siren: result.siren,
      siret_siege: siege.siret,
      raison_sociale: result.nom_complet,
      sigle: asso.sigle ?? result.sigle ?? null,
      forme_juridique: result.nature_juridique,
      code_ape: siege.activite_principale,
      adresse: [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean).join(" "),
      code_postal: siege.code_postal,
      commune: siege.libelle_commune,
      departement: siege.departement,
      representant_nom: representant
        ? [representant.prenom, representant.nom].filter(Boolean).join(" ")
        : null,
      representant_qualite: representant?.qualite ?? null,
      date_mise_a_jour: siege.date_mise_a_jour ?? result.date_mise_a_jour ?? null,
      // Champs spécifiques associations via minimal=false
      rna: asso.id_association ?? null,
      objet_social: asso.objet ?? null,
      date_creation: asso.date_creation ?? null,
      telephone: asso.telephone ?? null,
      email: asso.email ?? null,
      site_web: asso.site_web ?? null,
      agrement: asso.agrement?.[0]?.type ?? null,
    });
  } catch (err) {
    console.error("Sirene API error:", err);
    return NextResponse.json(
      { error: "L'API Sirene est temporairement indisponible. Veuillez saisir les informations manuellement." },
      { status: 503 }
    );
  }
}
