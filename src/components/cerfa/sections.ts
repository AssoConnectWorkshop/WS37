import type { CerfaData, SectionMeta } from "./types";

// Sections that describe the association (reusable across projects)
export const ASSOCIATION_SECTION_IDS = [1, 2, 3, 4, 5];

export const SECTIONS: SectionMeta[] = [
  {
    id: 0,
    title: "Nature de la demande",
    icon: "FileText",
    fields: [
      { key: "s0_forme_demande", label: "Forme de la demande", type: "select", options: ["Subvention de fonctionnement", "Subvention de projet", "Aide en nature", "Mise à disposition"] },
      { key: "s0_recurrence", label: "Récurrence", type: "select", options: ["Première demande", "Renouvellement"] },
      { key: "s0_objet_demande", label: "Objet de la demande", type: "textarea" },
      { key: "s0_periode_debut", label: "Début de la période couverte", type: "date" },
      { key: "s0_periode_fin", label: "Fin de la période couverte", type: "date" },
    ],
  },
  {
    id: 1,
    title: "Identification de l'association",
    icon: "Building2",
    fields: [
      { key: "s1_raison_sociale", label: "Raison sociale" },
      { key: "s1_sigle", label: "Sigle" },
      { key: "s1_siren", label: "SIREN" },
      { key: "s1_siret", label: "SIRET (siège)" },
      { key: "s1_rna", label: "Numéro RNA" },
      { key: "s1_forme_juridique", label: "Forme juridique" },
      { key: "s1_code_ape", label: "Code APE" },
      { key: "s1_adresse", label: "Adresse du siège" },
      { key: "s1_code_postal", label: "Code postal" },
      { key: "s1_commune", label: "Commune" },
      { key: "s1_tel", label: "Téléphone" },
      { key: "s1_email", label: "Courriel" },
      { key: "s1_site_web", label: "Site internet" },
      { key: "s1_representant_nom", label: "Représentant légal (nom et prénom)" },
      { key: "s1_representant_qualite", label: "Qualité du représentant" },
      { key: "s1_objet_social", label: "Objet social", type: "textarea" },
      { key: "s1_date_creation", label: "Date de création", type: "date" },
    ],
  },
  {
    id: 2,
    title: "Relations avec l'administration",
    icon: "Landmark",
    fields: [
      { key: "s2_agrement_type", label: "Type d'agrément" },
      { key: "s2_agrement_numero", label: "Numéro d'agrément" },
      { key: "s2_agrement_date", label: "Date d'agrément", type: "date" },
      { key: "s2_impots_commerciaux", label: "Soumission aux impôts commerciaux", type: "select", options: ["Oui", "Non"] },
    ],
  },
  {
    id: 3,
    title: "Relations avec d'autres organismes",
    icon: "Network",
    fields: [
      { key: "s3_federation", label: "Fédération" },
      { key: "s3_reseau", label: "Réseau" },
      { key: "s3_union", label: "Union" },
    ],
  },
  {
    id: 4,
    title: "Moyens humains",
    icon: "Users",
    fields: [
      { key: "s4_salaries_etpt", label: "Salariés (en ETPT)", type: "number" },
      { key: "s4_benevoles", label: "Bénévoles", type: "number" },
      { key: "s4_volontaires", label: "Volontaires / service civique", type: "number" },
      { key: "s4_mise_disposition", label: "Personnels mis à disposition", type: "number" },
    ],
  },
  {
    id: 5,
    title: "Budget de l'association",
    icon: "BarChart2",
    fields: [
      { key: "s5_charges_personnel", label: "Charges de personnel (€)", type: "number" },
      { key: "s5_charges_fonctionnement", label: "Charges de fonctionnement (€)", type: "number" },
      { key: "s5_charges_interventions", label: "Charges d'interventions (€)", type: "number" },
      { key: "s5_charges_exceptionnelles", label: "Charges exceptionnelles (€)", type: "number" },
      { key: "s5_total_charges", label: "Total des charges (€)", type: "number" },
      { key: "s5_cotisations", label: "Cotisations (€)", type: "number" },
      { key: "s5_dons", label: "Dons et mécénat (€)", type: "number" },
      { key: "s5_subventions_publiques", label: "Subventions publiques (€)", type: "number" },
      { key: "s5_subventions_privees", label: "Subventions privées (€)", type: "number" },
      { key: "s5_prestations", label: "Prestations de services (€)", type: "number" },
      { key: "s5_produits_financiers", label: "Produits financiers (€)", type: "number" },
      { key: "s5_total_produits", label: "Total des produits (€)", type: "number" },
      { key: "s5_resultat", label: "Résultat (€)", type: "number" },
    ],
  },
  {
    id: 6,
    title: "Projet / objet de la demande",
    icon: "Target",
    fields: [
      { key: "s6_titre", label: "Intitulé du projet" },
      { key: "s6_objectif", label: "Objectif général", type: "textarea" },
      { key: "s6_description", label: "Description des actions", type: "textarea" },
      { key: "s6_public_cible", label: "Public cible / bénéficiaires", type: "textarea" },
      { key: "s6_territoire", label: "Territoire d'intervention" },
      { key: "s6_periode_debut", label: "Début du projet", type: "date" },
      { key: "s6_periode_fin", label: "Fin du projet", type: "date" },
      { key: "s6_budget_depenses", label: "Total dépenses du projet (€)", type: "number" },
      { key: "s6_budget_recettes", label: "Total recettes du projet (€)", type: "number" },
      { key: "s6_budget_subvention", label: "Montant de la subvention sollicitée (€)", type: "number" },
      { key: "s6_indicateurs", label: "Indicateurs d'évaluation", type: "textarea" },
    ],
  },
  {
    id: 7,
    title: "Attestations et montant demandé",
    icon: "CheckSquare",
    fields: [
      { key: "s7_financeur", label: "Organisme financeur" },
      { key: "s7_montant_demande", label: "Montant total demandé (€)", type: "number" },
      { key: "s7_aides_annee1", label: "Aides publiques reçues — N-2 (€)", type: "number" },
      { key: "s7_aides_annee2", label: "Aides publiques reçues — N-1 (€)", type: "number" },
      { key: "s7_aides_annee3", label: "Aides publiques reçues — N (€)", type: "number" },
    ],
  },
];

export const ASSOCIATION_SECTIONS = SECTIONS.filter((s) =>
  ASSOCIATION_SECTION_IDS.includes(s.id)
);

export const PROJECT_SECTIONS = SECTIONS.filter(
  (s) => !ASSOCIATION_SECTION_IDS.includes(s.id)
);

export function computeCompletion(data: CerfaData): number {
  const allFields = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
  const filled = allFields.filter((k) => {
    const v = data[k] as string | undefined;
    return v !== undefined && v !== null && String(v).trim() !== "";
  });
  return Math.round((filled.length / allFields.length) * 100);
}
