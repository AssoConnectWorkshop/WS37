import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const siren = req.nextUrl.searchParams.get("siren")?.replace(/\s/g, "");
  if (!siren) return NextResponse.json({ error: "SIREN requis" }, { status: 400 });

  try {
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/rna/v1/siret/${siren}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } }
    );
    if (res.status === 404) return NextResponse.json({ rna: null }, { status: 200 });
    if (!res.ok) throw new Error(`RNA API status ${res.status}`);
    const json = await res.json();
    const asso = json.association ?? json;

    return NextResponse.json({
      rna: asso.id_association ?? asso.numero_rna ?? null,
      objet: asso.objet ?? null,
      date_creation: asso.date_creation ?? null,
      agrement: asso.agrement ?? null,
      siege_adresse: asso.adresse_siege?.voie ?? null,
      siege_cp: asso.adresse_siege?.code_postal ?? null,
      siege_commune: asso.adresse_siege?.commune ?? null,
      date_mise_a_jour: asso.date_mise_a_jour ?? asso.date_derniere_mise_a_jour ?? null,
    });
  } catch {
    return NextResponse.json({ rna: null }, { status: 200 });
  }
}
