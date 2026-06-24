import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("q")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(
      `https://www.data-asso.fr/api/associations/name/${encodeURIComponent(name)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const json = await res.json();
    // Normalize to a consistent shape regardless of exact API response structure
    const results = (Array.isArray(json) ? json : json.associations ?? json.results ?? [])
      .slice(0, 8)
      .map((a: Record<string, string>) => ({
        nom: a.titre ?? a.nom ?? a.name ?? "",
        siren: a.siren ?? a.numero_siren ?? null,
        rna: a.id_association ?? a.numero_rna ?? a.rna ?? null,
        siret: a.siret ?? null,
        commune: a.commune ?? a.ville ?? null,
        code_postal: a.code_postal ?? null,
      }))
      .filter((a: { nom: string }) => a.nom);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
