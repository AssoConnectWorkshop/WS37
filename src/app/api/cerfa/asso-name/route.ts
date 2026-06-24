import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("q")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}&per_page=8&nature_juridique=9210,9220,9230,9240,9260,9270,9300`,
      { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const json = await res.json();

    const results = (json.results ?? []).map((a: {
      siren: string;
      nom_complet: string;
      siege?: { siret?: string; code_postal?: string; libelle_commune?: string };
    }) => ({
      nom: a.nom_complet,
      siren: a.siren,
      rna: null,
      siret: a.siege?.siret ?? null,
      commune: a.siege?.libelle_commune ?? null,
      code_postal: a.siege?.code_postal ?? null,
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
