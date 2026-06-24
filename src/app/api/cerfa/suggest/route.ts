import Anthropic from "@anthropic-ai/sdk";
import type { CerfaData } from "@/components/cerfa/types";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const { fieldKey, fieldLabel, sectionTitle, data } = (await req.json()) as {
    fieldKey: string;
    fieldLabel: string;
    sectionTitle: string;
    data: CerfaData;
  };

  const assocName = data.s1_raison_sociale ? `Association : ${data.s1_raison_sociale}` : null;
  const projectTitle = data.s6_titre ? `Projet : ${data.s6_titre}` : null;
  const funder = data.s7_financeur ? `Financeur visé : ${data.s7_financeur}` : null;
  const objet = data.s1_objet_social ? `Objet social : ${data.s1_objet_social}` : null;
  const formedemande = data.s0_forme_demande ? `Forme de la demande : ${data.s0_forme_demande}` : null;
  const objetdemande = data.s0_objet_demande && fieldKey !== "s0_objet_demande"
    ? `Objet de la demande : ${data.s0_objet_demande}`
    : null;
  const objectif = data.s6_objectif && fieldKey !== "s6_objectif"
    ? `Objectif général : ${data.s6_objectif}`
    : null;
  const description = data.s6_description && fieldKey !== "s6_description"
    ? `Description des actions : ${data.s6_description}`
    : null;
  const publicCible = data.s6_public_cible && fieldKey !== "s6_public_cible"
    ? `Public cible : ${data.s6_public_cible}`
    : null;
  const territoire = data.s6_territoire ? `Territoire : ${data.s6_territoire}` : null;

  const contextLines = [assocName, projectTitle, funder, objet, formedemande, objetdemande, objectif, description, publicCible, territoire]
    .filter(Boolean)
    .join("\n");

  const prompt = `Tu aides une association française à remplir le formulaire Cerfa 12156*06 de demande de subvention.

Contexte connu :
${contextLines || "(aucun contexte disponible)"}

Génère une proposition de texte pour le champ "${fieldLabel}" (section : ${sectionTitle}).

Consignes :
- Rédige directement le contenu du champ, sans introduction ni explication
- Adopte un style formel adapté à une demande de subvention publique
- Sois concis et précis (2 à 5 phrases maximum)
- Si le contexte est insuffisant, génère un texte générique mais pertinent et professionnel
- Ne mentionne pas que c'est une suggestion ou que tu es une IA`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return Response.json({ suggestion: text.trim() });
}
