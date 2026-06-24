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

interface Suggestion {
  siren: string;
  nom: string;
  code_postal: string;
  commune: string;
}

interface Props {
  onData: (data: Partial<CerfaData>, sources: Partial<Record<keyof CerfaData, FieldSource>>) => void;
}

function isNumericQuery(s: string) {
  return /^\d[\d\s]*$/.test(s);
}

export function SirenSearch({ onData }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SireneResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAndApply = useCallback(async (siren: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowDropdown(false);

    try {
      const [sireneRes, rnaRes] = await Promise.all([
        fetch(`/api/cerfa/sirene?siren=${siren}`).then((r) => r.json()),
        fetch(`/api/cerfa/rna?siren=${siren}`).then((r) => r.json()),
      ]);

      if (sireneRes.error) { setError(sireneRes.error); return; }

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
      (Object.keys(data) as (keyof CerfaData)[]).forEach((k) => { sources[k] = "insee"; });
      onData(data, sources);
    } catch {
      setError("Erreur de connexion à l'API. Veuillez réessayer ou saisir manuellement.");
    } finally {
      setLoading(false);
    }
  }, [onData]);

  const handleChange = (value: string) => {
    setQuery(value);
    setResult(null);
    setError(null);

    if (isNumericQuery(value)) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(`/api/cerfa/asso-name?q=${encodeURIComponent(trimmed)}`);
        const list: Suggestion[] = await res.json();
        setSuggestions(list);
        setShowDropdown(list.length > 0);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  };

  const handleSearchBySiren = () => {
    const clean = query.replace(/\s/g, "");
    if (!clean || !isNumericQuery(query)) return;
    fetchAndApply(clean);
  };

  const handleSelect = (s: Suggestion) => {
    setQuery(s.nom);
    setSuggestions([]);
    setShowDropdown(false);
    fetchAndApply(s.siren);
  };

  const isText = query.trim().length > 0 && !isNumericQuery(query);

  return (
    <div className="space-y-3">
      <label className="text-[13px] font-semibold text-[#1A1A2E]">
        Recherche par nom ou SIREN / SIRET
      </label>
      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isText) handleSearchBySiren();
                if (e.key === "Escape") setShowDropdown(false);
              }}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Nom de l'association ou numéro SIREN…"
              className="w-full border border-[#E5E9F2] rounded-lg px-4 py-2.5 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
              autoComplete="off"
            />
            {suggestLoading && (
              <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#316BF2]" />
            )}
          </div>
          {!isText && (
            <button
              type="button"
              onClick={handleSearchBySiren}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#316BF2] hover:bg-[#1E54D4] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Rechercher
            </button>
          )}
          {loading && isText && (
            <div className="flex items-center px-3 text-[#316BF2]">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
        </div>

        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E5E9F2] rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <li key={s.siren}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#F0F5FF] transition-colors flex items-center justify-between gap-4 border-b border-[#F3F4F6] last:border-0"
                >
                  <span className="text-[13px] font-medium text-[#1A1A2E] truncate">{s.nom}</span>
                  <span className="text-[11px] text-[#6B7280] shrink-0">
                    {s.code_postal} {s.commune} · {s.siren}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
