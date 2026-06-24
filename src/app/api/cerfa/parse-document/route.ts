import { NextRequest, NextResponse } from "next/server";

type DocType =
  | "bilan_comptable"
  | "compte_resultat"
  | "cr_ag"
  | "statuts"
  | "rapport_activite"
  | "presentation_projet"
  | "inconnu";

function detectDocType(text: string): DocType {
  const score = (patterns: RegExp[]) => patterns.filter((p) => p.test(text)).length;
  const scores: Record<DocType, number> = {
    bilan_comptable: score([/bilan/i, /actif/i, /passif/i, /immobilis/i, /capitaux propres/i, /dettes/i]),
    compte_resultat: score([/compte de r[eé]sultat/i, /charges d.exploitation/i, /produits d.exploitation/i, /exc[eé]dent brut/i, /r[eé]sultat net/i]),
    cr_ag: score([/assembl[eé]e g[eé]n[eé]rale/i, /proc[eè]s.verbal/i, /\bpv\b/i, /ordre du jour/i, /membres pr[eé]sents/i, /quorum/i]),
    statuts: score([/statuts/i, /association r[eé]gie par/i, /loi du 1er juill/i, /objet social/i, /si[eè]ge social/i, /article \d+/i]),
    rapport_activite: score([/rapport d.activit/i, /bilan d.activit/i, /actions men[eé]es/i, /b[eé]n[eé]voles/i, /r[eé]alisations/i]),
    presentation_projet: score([/pr[eé]sentation de projet/i, /note de pr[eé]sentation/i, /objectifs/i, /public cible/i, /b[eé]n[eé]ficiaires/i, /actions pr[eé]vues/i]),
    inconnu: 0,
  };
  const best = (Object.entries(scores) as [DocType, number][]).filter(([k]) => k !== "inconnu").sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 2 ? best[0] : "inconnu";
}

function extractField(text: string, patterns: RegExp[]): string | null {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1]) return m[1].trim().replace(/\s+/g, " ").slice(0, 500);
  }
  return null;
}

function extractAmount(text: string, patterns: RegExp[]): string | null {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1]) return m[1].replace(/[\s ]/g, "").replace(",", ".");
  }
  return null;
}

function extractSection(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    const re = new RegExp(`(?:${kw})[^:]*:?\\s*([^\\n]{15,400})`, "i");
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

type Extracted = Record<string, string | null>;

function extractBilan(text: string): Extracted {
  return {
    s5_total_produits: extractAmount(text, [/total actif[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_total_charges: extractAmount(text, [/total passif[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_resultat: extractAmount(text, [/r[eé]sultat[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /exc[eé]dent[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
  };
}

function extractCompteResultat(text: string): Extracted {
  return {
    s5_charges_personnel: extractAmount(text, [/charges? de personnel[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /salaires et charges[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_charges_fonctionnement: extractAmount(text, [/autres charges[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /charges d.exploitation[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_charges_exceptionnelles: extractAmount(text, [/charges exceptionnelles[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_total_charges: extractAmount(text, [/total des charges[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /total charges[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_cotisations: extractAmount(text, [/cotisations[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_dons: extractAmount(text, [/dons[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /m[eé]c[eé]nat[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_subventions_publiques: extractAmount(text, [/subventions d.exploitation[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /subventions publiques[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_prestations: extractAmount(text, [/prestations de services[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_total_produits: extractAmount(text, [/total des produits[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /total produits[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s5_resultat: extractAmount(text, [/r[eé]sultat net[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /exc[eé]dent[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
  };
}

function extractCrAg(text: string): Extracted {
  return {
    s1_representant_nom: extractField(text, [
      /pr[eé]sident(?:e)?[\s:]+([A-ZÀ-Ÿ][a-zà-ÿ]+(?: [A-ZÀ-Ÿ][a-zà-ÿ]+)+)/,
      /[eé]lu(?:e)? pr[eé]sident(?:e)?[\s:]+([A-ZÀ-Ÿ][a-zà-ÿ]+(?: [A-ZÀ-Ÿ][a-zà-ÿ]+)+)/i,
    ]),
    s1_representant_qualite: "Président(e)",
    s4_benevoles: extractField(text, [/(\d+)\s*b[eé]n[eé]voles?/i, /(\d+)\s*adh[eé]rents?/i, /(\d+)\s*membres? pr[eé]sents?/i]),
  };
}

function extractStatuts(text: string): Extracted {
  return {
    s1_objet_social: extractSection(text, ["objet(?: de l.association)?", "but"]),
    s1_adresse: extractField(text, [/si[eè]ge social[^:]*:?\s*([^\n]{5,150})/i]),
    s1_forme_juridique: "Association loi 1901",
  };
}

function extractRapportActivite(text: string): Extracted {
  return {
    s4_salaries_etpt: extractField(text, [/(\d+(?:,\d+)?)\s*(?:ETPT|ETP)/i, /(\d+)\s*salari[eé]s?/i]),
    s4_benevoles: extractField(text, [/(\d+)\s*b[eé]n[eé]voles?/i]),
    s4_volontaires: extractField(text, [/(\d+)\s*volontaires?/i, /(\d+)\s*service civique/i]),
    s6_description: extractSection(text, ["actions men[eé]es", "r[eé]alisations", "activit[eé]s"]),
    s6_public_cible: extractSection(text, ["b[eé]n[eé]ficiaires", "public touch[eé]", "personnes aid[eé]es"]),
  };
}

function extractPresentationProjet(text: string): Extracted {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const dates = [...text.matchAll(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g)].map((m) => m[1]);
  return {
    s6_titre: extractField(text, [/(?:projet|intitul[eé]|titre)[^:]*:?\s*([^\n]{5,120})/i, /^#{1,3}\s+(.{5,120})$/m]) ?? lines.slice(0, 3).join(" ").slice(0, 120),
    s6_objectif: extractSection(text, ["objectif(?: g[eé]n[eé]ral)?", "finalit[eé]", "but du projet"]),
    s6_description: extractSection(text, ["actions? pr[eé]vue?s?", "d[eé]roulement", "programme", "activit[eé]s"]),
    s6_public_cible: extractSection(text, ["b[eé]n[eé]ficiaires", "public cible", "destinataires"]),
    s6_territoire: extractSection(text, ["territoire", "zone d.intervention", "p[eé]rim[eè]tre"]),
    s6_indicateurs: extractSection(text, ["indicateurs?", "[eé]valuation", "mesure du succ[eè]s"]),
    s6_periode_debut: dates[0] ?? null,
    s6_periode_fin: dates[dates.length - 1] ?? null,
    s6_budget_depenses: extractAmount(text, [/budget[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /co[uû]t total[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
    s6_budget_subvention: extractAmount(text, [/subvention[^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i, /montant demand[eé][^€\n]*?(\d[\d\s ]*(?:[,\.]\d{2})?)\s*€/i]),
  };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (file.name.toLowerCase().endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      text = buffer.toString("latin1").replace(/[^\x20-\x7E\xC0-\xFF\n\r]/g, " ").replace(/\s{3,}/g, "\n").slice(0, 80000);
    } else {
      return NextResponse.json({ error: "Format non supporté (.pdf ou .docx uniquement)" }, { status: 400 });
    }

    const docType = detectDocType(text);
    let extracted: Extracted = {};
    switch (docType) {
      case "bilan_comptable":   extracted = extractBilan(text); break;
      case "compte_resultat":   extracted = extractCompteResultat(text); break;
      case "cr_ag":             extracted = extractCrAg(text); break;
      case "statuts":           extracted = extractStatuts(text); break;
      case "rapport_activite":  extracted = extractRapportActivite(text); break;
      default:                  extracted = extractPresentationProjet(text); break;
    }

    const clean = Object.fromEntries(Object.entries(extracted).filter(([, v]) => v !== null && v !== ""));
    return NextResponse.json({ docType, extracted: clean, charCount: text.length, fieldsFound: Object.keys(clean).length });
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse du document" }, { status: 500 });
  }
}
