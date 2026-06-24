import { NextRequest, NextResponse } from "next/server";

function extractField(text: string, patterns: RegExp[]): string | null {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractAmount(text: string): string | null {
  const m = text.match(/(\d[\d\s]*(?:,\d{2})?)\s*€|\b(\d[\d\s]+)\s*euros?/i);
  if (m) return (m[1] ?? m[2]).replace(/\s/g, "");
  return null;
}

function extractDates(text: string): { debut: string | null; fin: string | null } {
  const dates = [...text.matchAll(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4})\b/g)].map((m) => m[1]);
  return { debut: dates[0] ?? null, fin: dates[dates.length - 1] ?? null };
}

function extractSection(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    const re = new RegExp(`${kw}[^:]*:?\\s*([^\\n]{10,300})`, "i");
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function parseText(text: string): Record<string, string | null> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLines = lines.slice(0, 5).join(" ");

  return {
    titre_projet: extractField(text, [
      /(?:projet|intitulé|titre)\s*:?\s*([^\n]{5,120})/i,
      /^#{1,3}\s+(.{5,120})$/m,
    ]) ?? firstLines.slice(0, 120),

    objectif: extractSection(text, ["objectif", "finalité", "but", "ambition"]),
    description_actions: extractSection(text, ["action", "déroulement", "programme", "activité"]),
    public_cible: extractSection(text, ["bénéficiaire", "public", "destinataire", "cible"]),
    evaluation: extractSection(text, ["évaluation", "indicateur", "mesure", "résultat attendu"]),

    budget_total: extractAmount(text),

    etpt: extractField(text, [/(\d+(?:,\d+)?)\s*(?:ETPT|ETP|poste)/i]),
    benevoles: extractField(text, [/(\d+)\s*bénévoles?/i]),
    volontaires: extractField(text, [/(\d+)\s*volontaires?/i]),

    periode_debut: extractDates(text).debut,
    periode_fin: extractDates(text).fin,
  };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (file.name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.endsWith(".pdf")) {
      // Basic PDF text extraction: extract readable ASCII strings from buffer
      text = buffer
        .toString("latin1")
        .replace(/[^\x20-\x7E\xC0-\xFF\n\r]/g, " ")
        .replace(/\s{3,}/g, "\n")
        .slice(0, 50000);
    } else {
      return NextResponse.json({ error: "Format non supporté (PDF ou DOCX uniquement)" }, { status: 400 });
    }

    const extracted = parseText(text);
    return NextResponse.json({ extracted, charCount: text.length });
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse du document" }, { status: 500 });
  }
}
