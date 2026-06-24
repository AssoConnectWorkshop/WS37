'use client';

import { useState } from "react";
import { Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { CerfaData, FieldSource } from "./types";

interface SireneResult {
  siren: string;
  siret_siege: string;
  raison_sociale: string;
  forme_juridique: string;
  code_ape: string;
  adresse: string;
  code_postal: string;
  commune: string;
  departement: string;
  representant_nom: string | null;
  representant_qualite: string | null;
}

interface RnaResult {
  rna: string | null;
  objet: string | null;
  date_creation: string | null;
  agrement: string | null;
}

interface Props {
  onData: (data: Partial<CerfaData>, sources: Partial<Record<keyof CerfaData, FieldSource>>) => void;
}

export function SirenSearch({ onData }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SireneResult | null>(null);

  const search = async () => {
    const clean = query.replace(/\s/g, "");
    if (!clean) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [sireneRes, rnaRes] = await Promise.all([
        fetch(`/api/cerfa/sirene?siren=${clean}`).then((r) => r.json()),
        fetch(`/api/cerfa/rna?siren=${clean}`).then((r) => r.json()),
      ]);

      if (sireneRes.error) {
        setError(sireneRes.error);
        return;
      }

      setResult(sireneRes);
      const rna: RnaResult = rnaRes;

      const data: Partial<CerfaData> = {
        s1_siren: sireneRes.siren,
        s1_siret: sireneRes.siret_siege,
        s1_raison_sociale: sireneRes.raison_sociale,
        s1_forme_juridique: sireneRes.forme_juridique,
        s1_code_ape: sireneRes.code_ape,
        s1_adresse: sireneRes.adresse,
        s1_code_postal: sireneRes.code_postal,
        s1_commune: sireneRes.commune,
        ...(sireneRes.representant_nom && { s1_representant_nom: sireneRes.representant_nom }),
        ...(sireneRes.representant_qualite && { s1_representant_qualite: sireneRes.representant_qualite }),
        ...(rna.rna && { s1_rna: rna.rna }),
        ...(rna.objet && { s1_objet_social: rna.objet }),
        ...(rna.date_creation && { s1_date_creation: rna.date_creation }),
        ...(rna.agrement && { s2_agrement_type: rna.agrement }),
      };

      const sources: Partial<Record<keyof CerfaData, FieldSource>> = {};
      (Object.keys(data) as (keyof CerfaData)[]).forEach((k) => {
        sources[k] = "insee";
      });

      onData(data, sources);
    } catch {
      setError("Erreur de connexion à l'API. Veuillez réessayer ou saisir manuellement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-[13px] font-semibold text-[#1A1A2E]">
        Recherche par SIREN / SIRET
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Ex : 775 672 272 (Croix Rouge française)"
          className="flex-1 border border-[#E5E9F2] rounded-lg px-4 py-2.5 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#316BF2] hover:bg-[#1E54D4] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Rechercher
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-[#EEF3FE] border border-[#316BF2]/20 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#316BF2]" />
            <span className="text-[13px] font-semibold text-[#316BF2]">{result.raison_sociale}</span>
            <span className="ml-auto text-[11px] bg-[#316BF2] text-white px-2 py-0.5 rounded font-medium">Source : INSEE</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
            <span><b className="text-[#1A1A2E]">SIREN :</b> {result.siren}</span>
            <span><b className="text-[#1A1A2E]">APE :</b> {result.code_ape}</span>
            <span><b className="text-[#1A1A2E]">Siège :</b> {result.code_postal} {result.commune}</span>
            {result.representant_nom && (
              <span><b className="text-[#1A1A2E]">Représentant :</b> {result.representant_nom}</span>
            )}
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Les champs de la section 1 ont été pré-remplis automatiquement. Vous pouvez les modifier.
          </p>
        </div>
      )}
    </div>
  );
}
