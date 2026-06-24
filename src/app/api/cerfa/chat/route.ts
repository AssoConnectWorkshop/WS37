import Anthropic from "@anthropic-ai/sdk";
import type { CerfaData } from "@/components/cerfa/types";
import { PROJECT_SECTIONS } from "@/components/cerfa/sections";

const anthropic = new Anthropic();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const PRIORITY_FIELDS = [
  "s6_titre", "s6_objectif", "s6_description", "s6_public_cible",
  "s6_territoire", "s6_periode_debut", "s6_periode_fin",
  "s6_budget_depenses", "s6_budget_subvention", "s7_financeur",
];

function buildSystemPrompt(data: CerfaData): string {
  const allProjectFields = PROJECT_SECTIONS.flatMap((s) => s.fields);
  const filled = allProjectFields.filter((f) => {
    const v = data[f.key as keyof CerfaData];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });
  const empty = allProjectFields.filter((f) => {
    const v = data[f.key as keyof CerfaData];
    return !v || String(v).trim() === "";
  });

  const priorityEmpty = empty.filter((f) => PRIORITY_FIELDS.includes(f.key));
  const context = [
    data.s1_raison_sociale && `Association : ${data.s1_raison_sociale}`,
    data.s1_objet_social && `Objet social : ${data.s1_objet_social}`,
    data.s6_titre && `Projet : ${data.s6_titre}`,
    data.s7_financeur && `Financeur : ${data.s7_financeur}`,
  ].filter(Boolean).join("\n");

  return `Tu es un assistant bienveillant qui aide une association française à compléter sa demande de subvention (formulaire Cerfa 12156*06).

Contexte déjà connu :
${context || "(aucun contexte pour l'instant)"}

Champs déjà remplis : ${filled.length} / ${allProjectFields.length}
Champs prioritaires encore vides :
${priorityEmpty.map((f) => `- ${f.key}: ${f.label}`).join("\n") || "Tous les champs prioritaires sont remplis !"}

Règles :
- Pose UNE SEULE question à la fois, simple et conversationnelle (pas de jargon administratif)
- Adapte ta question au contexte connu (ne re-demande pas ce qui est déjà rempli)
- Quand l'utilisateur répond, extrais les valeurs correspondantes
- Si le champ est une date, reformate en JJ/MM/AAAA
- Si le champ est un montant, extrais uniquement le chiffre
- Quand tous les champs prioritaires sont remplis, félicite l'utilisateur et mets isDone à true
- Sois chaleureux et encourageant

IMPORTANT : Réponds TOUJOURS avec un JSON valide et rien d'autre :
{
  "message": "ta question ou ton message à l'utilisateur",
  "fieldsToFill": [{"key": "nom_du_champ_cerfa", "value": "valeur extraite"}],
  "isDone": false
}`;
}

export async function POST(req: Request) {
  const { data, messages } = (await req.json()) as {
    data: CerfaData;
    messages: ChatMessage[];
  };

  const system = buildSystemPrompt(data);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system,
    messages: messages.length > 0 ? messages : [{ role: "user", content: "Bonjour, je commence la saisie de mon projet." }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("").trim();

  try {
    const parsed = JSON.parse(text);
    return Response.json(parsed);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return Response.json(JSON.parse(match[0]));
      } catch { /* fall through */ }
    }
    return Response.json({ message: text, fieldsToFill: [], isDone: false });
  }
}
