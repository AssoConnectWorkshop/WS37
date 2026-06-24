'use client';

import { useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import type { CerfaData, FieldSource } from "./types";

export type UploadContext = "association" | "projet";

interface Props {
  context?: UploadContext;
  onExtracted: (data: Partial<CerfaData>, sources: Partial<Record<keyof CerfaData, FieldSource>>) => void;
}

interface UploadedDoc {
  name: string;
  docType: string;
  fieldsFound: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  bilan_comptable: "Bilan comptable",
  compte_resultat: "Compte de résultat",
  cr_ag: "CR d'assemblée générale",
  statuts: "Statuts",
  rapport_activite: "Rapport d'activité",
  presentation_projet: "Présentation de projet",
  inconnu: "Document",
};

const DOC_TYPE_SECTIONS: Record<string, string> = {
  bilan_comptable: "→ Section 5 (budget)",
  compte_resultat: "→ Section 5 (charges, produits)",
  cr_ag: "→ Sections 1, 2, 4",
  statuts: "→ Section 1 (objet social, siège)",
  rapport_activite: "→ Sections 4, 6",
  presentation_projet: "→ Section 6 (projet, objectifs)",
  inconnu: "→ Section 6",
};

const CONTEXT_CONFIG: Record<UploadContext, { hint: string[]; placeholder: string }> = {
  association: {
    hint: ["Bilan comptable", "Compte de résultat", "CR d'assemblée générale", "Statuts", "Rapport d'activité"],
    placeholder: "Déposez un document de votre association",
  },
  projet: {
    hint: ["Note de présentation", "Dossier de demande", "Descriptif d'actions", "Budget prévisionnel"],
    placeholder: "Déposez un document de présentation du projet",
  },
};

const FIELD_MAPPING: Partial<Record<string, keyof CerfaData>> = {
  s1_adresse: "s1_adresse", s1_code_postal: "s1_code_postal", s1_commune: "s1_commune",
  s1_forme_juridique: "s1_forme_juridique", s1_objet_social: "s1_objet_social",
  s1_representant_nom: "s1_representant_nom", s1_representant_qualite: "s1_representant_qualite",
  s1_date_creation: "s1_date_creation",
  s2_agrement_type: "s2_agrement_type", s2_agrement_date: "s2_agrement_date",
  s4_salaries_etpt: "s4_salaries_etpt", s4_benevoles: "s4_benevoles",
  s4_volontaires: "s4_volontaires",
  s5_charges_personnel: "s5_charges_personnel", s5_charges_fonctionnement: "s5_charges_fonctionnement",
  s5_charges_exceptionnelles: "s5_charges_exceptionnelles",
  s5_total_charges: "s5_total_charges", s5_cotisations: "s5_cotisations",
  s5_dons: "s5_dons", s5_subventions_publiques: "s5_subventions_publiques",
  s5_prestations: "s5_prestations", s5_total_produits: "s5_total_produits",
  s5_resultat: "s5_resultat",
  s6_titre: "s6_titre", s6_objectif: "s6_objectif", s6_description: "s6_description",
  s6_public_cible: "s6_public_cible", s6_territoire: "s6_territoire",
  s6_periode_debut: "s6_periode_debut", s6_periode_fin: "s6_periode_fin",
  s6_budget_depenses: "s6_budget_depenses", s6_budget_subvention: "s6_budget_subvention",
  s6_indicateurs: "s6_indicateurs",
};

export function DocumentUpload({ context = "association", onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [showHints, setShowHints] = useState(false);

  const cfg = CONTEXT_CONFIG[context];

  const processFile = async (file: File) => {
    setError(null);
    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/cerfa/parse-document", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");

      const { docType, extracted, fieldsFound } = json;
      setDocs((prev) => [...prev, { name: file.name, docType, fieldsFound }]);

      const data: Partial<CerfaData> = {};
      const sources: Partial<Record<keyof CerfaData, FieldSource>> = {};

      for (const [key, value] of Object.entries(extracted as Record<string, string>)) {
        const dest = FIELD_MAPPING[key];
        if (dest && value) {
          (data as Record<string, string>)[dest] = value;
          sources[dest] = "document";
        }
      }

      onExtracted(data, sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  };

  return (
    <div className="space-y-3">
      {/* Uploaded docs list */}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#EEF3FE] border border-[#316BF2]/20 rounded-lg">
              <CheckCircle2 size={16} className="text-[#316BF2] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A2E] truncate">{doc.name}</p>
                <p className="text-[11px] text-[#6B7280]">
                  <span className="font-medium text-[#316BF2]">{DOC_TYPE_LABELS[doc.docType] ?? doc.docType}</span>
                  {" — "}
                  {doc.fieldsFound} champ{doc.fieldsFound > 1 ? "s" : ""} extrait{doc.fieldsFound > 1 ? "s" : ""}
                  {" "}
                  <span className="opacity-60">{DOC_TYPE_SECTIONS[doc.docType]}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocs((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-[#6B7280] hover:text-[#EF4444] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragging
            ? "border-[#316BF2] bg-[#316BF2]/10"
            : docs.length > 0
            ? "border-[#E5E9F2] bg-[#F8FAFF] hover:border-[#316BF2]/40"
            : "border-[#316BF2]/40 bg-[#EEF3FE] hover:bg-[#316BF2]/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={(e) => Array.from(e.target.files ?? []).forEach(processFile)}
        />
        {loading ? (
          <>
            <Loader2 size={28} className="text-[#316BF2] animate-spin" />
            <p className="text-[13px] text-[#316BF2] font-medium">Analyse en cours…</p>
          </>
        ) : (
          <>
            <Upload size={28} className={docs.length > 0 ? "text-[#6B7280]" : "text-[#316BF2]"} />
            <div className="text-center">
              <p className={`text-[13px] font-medium ${docs.length > 0 ? "text-[#6B7280]" : "text-[#316BF2]"}`}>
                {docs.length > 0 ? "Ajouter un autre document" : cfg.placeholder}
              </p>
              <p className="text-[12px] text-[#6B7280] mt-0.5">Cliquez ou glissez-déposez — PDF ou DOCX</p>
            </div>
          </>
        )}
      </div>

      {/* Type hints toggle */}
      <button
        type="button"
        onClick={() => setShowHints((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#316BF2] transition-colors"
      >
        {showHints ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        Quels types de documents sont acceptés ?
      </button>

      {showHints && (
        <div className="p-3 bg-[#F8FAFF] border border-[#E5E9F2] rounded-lg">
          <p className="text-[12px] text-[#6B7280] mb-2 font-medium">Documents reconnus automatiquement :</p>
          <div className="flex flex-wrap gap-2">
            {cfg.hint.map((h) => (
              <span key={h} className="flex items-center gap-1 text-[11px] text-[#6B7280] bg-white border border-[#E5E9F2] px-2 py-1 rounded">
                <FileText size={10} /> {h}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-2">
            Déposez plusieurs documents — les données s&apos;accumulent et complètent le formulaire.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
