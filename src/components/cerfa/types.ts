export type FieldSource = "insee" | "document" | "manuel";

export interface UploadedDoc {
  name: string;
  docType: string;
  fieldsFound: number;
  uploadedAt: string;
}

export interface CerfaData {
  // Section 0 — Nature de la demande
  s0_forme_demande?: string;
  s0_recurrence?: string;
  s0_objet_demande?: string;
  s0_periode_debut?: string;
  s0_periode_fin?: string;

  // Section 1 — Identification
  s1_siren?: string;
  s1_siret?: string;
  s1_rna?: string;
  s1_raison_sociale?: string;
  s1_sigle?: string;
  s1_forme_juridique?: string;
  s1_code_ape?: string;
  s1_adresse?: string;
  s1_code_postal?: string;
  s1_commune?: string;
  s1_tel?: string;
  s1_email?: string;
  s1_site_web?: string;
  s1_representant_nom?: string;
  s1_representant_qualite?: string;
  s1_objet_social?: string;
  s1_date_creation?: string;

  // Section 2 — Relations avec l'administration
  s2_agrement_type?: string;
  s2_agrement_numero?: string;
  s2_agrement_date?: string;
  s2_impots_commerciaux?: string;

  // Section 3 — Relations avec d'autres associations
  s3_federation?: string;
  s3_reseau?: string;
  s3_union?: string;

  // Section 4 — Moyens humains
  s4_salaries_etpt?: string;
  s4_benevoles?: string;
  s4_volontaires?: string;
  s4_mise_disposition?: string;

  // Section 5 — Budget association
  s5_charges_personnel?: string;
  s5_charges_fonctionnement?: string;
  s5_charges_interventions?: string;
  s5_charges_exceptionnelles?: string;
  s5_total_charges?: string;
  s5_cotisations?: string;
  s5_dons?: string;
  s5_subventions_publiques?: string;
  s5_subventions_privees?: string;
  s5_prestations?: string;
  s5_produits_financiers?: string;
  s5_total_produits?: string;
  s5_resultat?: string;

  // Section 6 — Projet
  s6_titre?: string;
  s6_objectif?: string;
  s6_description?: string;
  s6_public_cible?: string;
  s6_territoire?: string;
  s6_periode_debut?: string;
  s6_periode_fin?: string;
  s6_budget_depenses?: string;
  s6_budget_recettes?: string;
  s6_budget_subvention?: string;
  s6_indicateurs?: string;

  // Section 7 — Attestations
  s7_aides_annee1?: string;
  s7_aides_annee2?: string;
  s7_aides_annee3?: string;
  s7_montant_demande?: string;
  s7_financeur?: string;

  // Internal — uploaded document metadata (not Cerfa fields)
  _docs_association?: UploadedDoc[];
  _docs_projet?: UploadedDoc[];
}

export interface CerfaAssociation {
  id: string;
  created_at: string;
  updated_at: string;
  nom: string;
  data: CerfaData;
}

export interface CerfaProject {
  id: string;
  created_at: string;
  updated_at: string;
  association_id: string | null;
  nom_projet: string;
  nom_association: string | null;
  siren: string | null;
  financeur: string | null;
  statut: "en_cours" | "genere";
  generated_at: string | null;
  completion_pct: number;
  data: CerfaData;
}

export interface FieldMeta {
  key: keyof CerfaData;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "number";
  options?: string[];
  source?: FieldSource;
}

export type SectionMeta = {
  id: number;
  title: string;
  icon: string;
  fields: FieldMeta[];
};
