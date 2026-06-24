'use client';

import { useState, useRef, useEffect, useCallback } from "react";
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

interface AssoSuggestion {
  nom: string;
  siren: string | null;
  rna: string | null;
  siret: string | null;
  commune: string | null;
  code_postal: string | null;
}

interface Props {
  onData: (data: Partial<CerfaData>, sources: Partial<Record<keyof CerfaData, FieldSource>>) => void;
}

export function SirenSearch({ onData }: Props) {
  const [sirenQuery, setSirenQuery] = useState("");
  const [sirenLoading, setSirenLoading] = useState(false);
  const [sirenError, setSirenError] = useState<string | null>(null);
  const [sirenResult, setSirenResult] = useState<SireneResult | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AssoSuggestion[]>([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setNameLoading(true);
      try {
        const res = await fetch(`/api/cerfa/asso-name?q=${encodeURIComponent(q)}`);
        const data: AssoSuggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setNameLoading(false);
      }
    }, 300);
  }, []);

  const handleNameInput = (val: string) => {
    setNameQuery(val);
    fetchSuggestions(val);
  };

  const selectSuggestion = (s: AssoSuggestion) => {
    setShowDropdown(false);
    setNameQuery(s.nom);
    if (s.siren) {
      setSirenQuery(s.siren);
      // Trigger a full SIREN lookup to get all fields
      lookupSiren(s.siren);
    } else if (s.rna) {
      // Pre-fill what we have from the suggestion
      const data: Partial<CerfaData> = {
        s1_raison_sociale: s.nom,
        ...(s.rna && { s1_rna: s.rna }),
        ...(s.siret && { s1_siret: s.siret }),
        ...(s.code_postal && { s1_code_postal: s.code_postal }),
        ...(s.commune && { s1_commune: s.commune }),
      };
      const sources: Partial<Record<keyof CerfaData, FieldSource>> = {};
      (Object.keys(data) as (keyof CerfaData)[]).forEach((k) => { sources[k] = "insee"; });
      onData(data, sources);
    }
  };

  const lookupSiren = async (siren: string) => {
    const clean = siren.replace(/\s/g, "");
    if (!clean) return;
    setSirenLoading(true);
    setSirenError(null);
    setSirenResult(null);

    try {
      const [sireneRes, rnaRes] = await Promise.all([
        fetch(`/api/cerfa/sirene?siren=${clean}`).then((r) => r.json()),
        fetch(`/api/cerfa/rna?siren=${clean}`).then((r) => r.json()),
      ]);

      if (sireneRes.error) {
        setSirenError(sireneRes.error);
        return;
      }

      setSirenResult(sireneRes);
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
      (Object.keys(data) as (keyof CerfaData)[]).forEach((k) => { sources[k] = "insee"; });
      onData(data, sources);
    } catch {
      setSirenError("Erreur de connexion à l'API. Veuillez réessayer ou saisir manuellement.");
    } finally {
      setSirenLoading(false);
    }
  };

  const handleSirenSearch = () => lookupSiren(sirenQuery);

  return (
    <div className="space-y-4">
      {/* Search by name */}
      <div>
        <label className="text-[13px] font-semibold text-[#1A1A2E] block mb-1.5">
          Recherche par nom
        </label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => handleNameInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Ex : Croix Rouge française, Les Restos du Cœur…"
              className="w-full border border-[#E5E9F2] rounded-lg px-4 py-2.5 pr-10 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
            />
            {nameLoading && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] animate-spin" />
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-[#E5E9F2] rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F8FAFF] border-b border-[#E5E9F2] last:border-0 transition-colors"
                >
                  <div className="text-[13px] font-medium text-[#1A1A2E] truncate">{s.nom}</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5 flex gap-3">
                    {s.siren && <span>SIREN {s.siren}</span>}
                    {s.rna && <span>RNA {s.rna}</span>}
                    {s.commune && <span>{s.code_postal} {s.commune}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[#E5E9F2]" />
        <span className="text-[11px] text-[#6B7280] font-medium uppercase tracking-wider">ou</span>
        <div className="flex-1 border-t border-[#E5E9F2]" />
      </div>

      {/* Search by SIREN */}
      <div>
        <label className="text-[13px] font-semibold text-[#1A1A2E] block mb-1.5">
          Recherche par SIREN / SIRET
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={sirenQuery}
            onChange={(e) => setSirenQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSirenSearch()}
            placeholder="Ex : 775 672 272"
            className="flex-1 border border-[#E5E9F2] rounded-lg px-4 py-2.5 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
          />
          <button
            type="button"
            onClick={handleSirenSearch}
            disabled={sirenLoading || !sirenQuery.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#316BF2] hover:bg-[#1E54D4] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-colors"
          >
            {sirenLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Rechercher
          </button>
        </div>
      </div>

      {sirenError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-700">{sirenError}</p>
        </div>
      )}

      {sirenResult && (
        <div className="p-4 bg-[#EEF3FE] border border-[#316BF2]/20 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#316BF2]" />
            <span className="text-[13px] font-semibold text-[#316BF2]">{sirenResult.raison_sociale}</span>
            <span className="ml-auto text-[11px] bg-[#316BF2] text-white px-2 py-0.5 rounded font-medium">Source : INSEE</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
            <span><b className="text-[#1A1A2E]">SIREN :</b> {sirenResult.siren}</span>
            <span><b className="text-[#1A1A2E]">APE :</b> {sirenResult.code_ape}</span>
            <span><b className="text-[#1A1A2E]">Siège :</b> {sirenResult.code_postal} {sirenResult.commune}</span>
            {sirenResult.representant_nom && (
              <span><b className="text-[#1A1A2E]">Représentant :</b> {sirenResult.representant_nom}</span>
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
