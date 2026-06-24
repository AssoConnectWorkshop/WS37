import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cerfa_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cerfa_projects")
    .insert({
      nom_projet: body.nom_projet ?? "Nouveau projet",
      nom_association: body.nom_association ?? null,
      siren: body.siren ?? null,
      financeur: body.financeur ?? null,
      statut: "en_cours",
      completion_pct: body.completion_pct ?? 0,
      data: body.data ?? {},
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
