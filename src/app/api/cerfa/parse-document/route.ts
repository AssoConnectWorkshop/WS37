import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `Tu analyses un document d'une association française pour extraire des informations destinées au formulaire Cerfa 12156*06 de demande de subvention.

Extrais uniquement les informations explicitement présentes dans le document et retourne un JSON avec les champs suivants (n'inclus que ceux trouvés) :

Champs projet (section 6) :
- s6_titre : intitulé / titre du projet
- s6_objectif : objectif général du projet (texte)
- s6_description : description des actions prévues (texte)
- s6_public_cible : public cible / bénéficiaires (texte)
- s6_territoire : territoire d'intervention (texte court)
- s6_periode_debut : date de début au format JJ/MM/AAAA
- s6_periode_fin : date de fin au format JJ/MM/AAAA
- s6_budget_depenses : budget total dépenses en chiffres seuls (ex: 15000)
- s6_budget_recettes : total recettes en chiffres seuls
- s6_budget_subvention : montant subvention demandée en chiffres seuls
- s6_indicateurs : indicateurs d'évaluation (texte)

Champs association (si présents) :
- s1_raison_sociale : nom de l'association
- s1_objet_social : objet social (texte)
- s1_adresse : adresse du siège
- s1_code_postal : code postal (5 chiffres)
- s1_commune : ville
- s1_representant_nom : nom et prénom du représentant légal
- s4_benevoles : nombre de bénévoles (chiffre seul)
- s4_salaries_etpt : nombre de salariés ETPT (chiffre seul)

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication, sans balises. Exemple : {"s6_titre":"Mon projet","s6_objectif":"..."}`;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const isDocx = file.name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: "Format non supporté (.pdf ou .docx uniquement)" }, { status: 400 });
  }

  try {
    let extracted: Record<string, string> = {};

    if (isPdf) {
      const pdfContent: Anthropic.MessageParam = {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          } as Anthropic.DocumentBlockParam,
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      };
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [pdfContent],
      });

      const text = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("").trim();

      try {
        extracted = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) extracted = JSON.parse(match[0]);
      }
    } else {
      const mammoth = await import("mammoth");
      const { value: docText } = await mammoth.extractRawText({ buffer });

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\nDocument :\n${docText.slice(0, 60000)}`,
        }],
      });

      const text = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("").trim();

      try {
        extracted = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) extracted = JSON.parse(match[0]);
      }
    }

    const clean = Object.fromEntries(
      Object.entries(extracted).filter(([, v]) => v !== null && v !== "" && v !== undefined)
    );

    const docType = clean.s6_titre || clean.s6_objectif ? "presentation_projet"
      : clean.s5_total_charges ? "bilan_comptable"
      : clean.s1_objet_social ? "statuts"
      : "inconnu";

    return NextResponse.json({ docType, extracted: clean, fieldsFound: Object.keys(clean).length });
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse du document" }, { status: 500 });
  }
}
