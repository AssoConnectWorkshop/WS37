'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, ChevronRight, Loader2, Search } from "lucide-react";
import type { CerfaAssociation } from "@/components/cerfa/types";

interface Suggestion {
  siren: string;
  nom: string;
  code_postal: string | null;
  commune: string | null;
}

function isNumericQuery(s: string) {
  return /^\d[\d\s]*$/.test(s);
}

export default function CerfaHome() {
  const router = useRouter();
  const [associations, setAssociations] = useState<CerfaAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/cerfa/associations")
      .then((r) => r.json())
      .then((d) => setAssociations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (isNumericQuery(value) || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch(`/api/cerfa/asso-name?q=${encodeURIComponent(value.trim())}`);
        const list: Suggestion[] = await res.json();
        setSuggestions(list);
        setShowDropdown(list.length > 0);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  };

  const createAssociation = useCallback(async (nom: string, data: Record<string, unknown> = {}) => {
    setCreating(true);
    try {
      const res = await fetch("/api/cerfa/associations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, data }),
      });
      const asso = await res.json();
      if (!res.ok) throw new Error(asso.error);
      router.push(`/${asso.id}/association`);
    } catch (err) {
      alert("Erreur : " + (err instanceof Error ? err.message : "inconnue"));
    } finally {
      setCreating(false);
    }
  }, [router]);

  const handleSelect = useCallback(async (s: Suggestion) => {
    setQuery(s.nom);
    setSuggestions([]);
    setShowDropdown(false);
    setCreating(true);
    try {
      const [sireneRes, rnaRes] = await Promise.all([
        fetch(`/api/cerfa/sirene?siren=${s.siren}`).then((r) => r.json()),
        fetch(`/api/cerfa/rna?siren=${s.siren}`).then((r) => r.json()),
      ]);
      const data: Record<string, unknown> = {};
      if (!sireneRes.error) {
        Object.assign(data, {
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
        });
      }
      if (rnaRes.rna) data.s1_rna = rnaRes.rna;
      if (rnaRes.objet) data.s1_objet_social = rnaRes.objet;
      if (rnaRes.date_creation) data.s1_date_creation = rnaRes.date_creation;
      if (rnaRes.agrement) data.s2_agrement_type = rnaRes.agrement;
      await createAssociation(s.nom, data);
    } catch {
      await createAssociation(s.nom, {});
    }
  }, [createAssociation]);

  const handleCreate = () => {
    const q = query.trim();
    if (!q) return;
    createAssociation(q, {});
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFF" }}>
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#E5E9F2] flex items-center px-6 gap-3"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <span className="font-bold text-[18px] text-[#316BF2] tracking-tight">AssoConnect</span>
        <span className="w-px h-5 bg-[#E5E9F2]" />
        <span className="text-[13px] text-[#6B7280] font-medium">Générateur de Cerfa</span>
      </header>

      <main className="flex-1 pt-14 flex items-start justify-center">
        <div className="w-full max-w-2xl px-6 py-12 space-y-8">
          <div>
            <h1 className="text-[26px] font-bold text-[#1A1A2E]">Mes associations</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              Sélectionnez une association pour accéder à ses projets et paramètres.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-[#6B7280]">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Chargement…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {associations.map((a) => (
                <button
                  key={a.id}
                  onClick={() => router.push(`/${a.id}/en-cours`)}
                  className="w-full bg-white border border-[#E5E9F2] rounded-xl p-5 flex items-center gap-4 hover:border-[#316BF2]/40 hover:shadow-sm transition-all text-left"
                  style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.06)" }}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EEF3FE] flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-[#316BF2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#1A1A2E] truncate">{a.nom}</p>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">
                      {a.data?.s1_siren ? `SIREN ${a.data.s1_siren}` : "Informations à compléter"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[#6B7280] shrink-0" />
                </button>
              ))}

              {showForm ? (
                <div className="bg-white border border-[#316BF2]/30 rounded-xl p-5 space-y-3"
                  style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
                  <p className="text-[13px] font-semibold text-[#1A1A2E]">Nom ou SIREN de l&apos;association</p>
                  <div ref={wrapperRef} className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          autoFocus
                          value={query}
                          onChange={(e) => handleQueryChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !showDropdown) handleCreate();
                            if (e.key === "Escape") setShowDropdown(false);
                          }}
                          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                          placeholder="Ex : Les Restos du Coeur Paris ou 123456789"
                          className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
                        />
                        {suggestLoading && (
                          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#316BF2]" />
                        )}
                      </div>
                      <button
                        onClick={handleCreate}
                        disabled={creating || !query.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#316BF2] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E54D4] disabled:opacity-50 transition-colors"
                      >
                        {creating ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Créer
                      </button>
                      <button
                        onClick={() => { setShowForm(false); setQuery(""); setSuggestions([]); }}
                        className="px-4 py-2 text-[#6B7280] text-[13px] font-medium rounded-lg hover:bg-[#F8FAFF] border border-[#E5E9F2] transition-colors"
                      >
                        Annuler
                      </button>
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
                </div>
              ) : (
                <button
                  onClick={() => { setShowForm(true); setQuery(""); }}
                  className="w-full border-2 border-dashed border-[#E5E9F2] rounded-xl p-5 flex items-center gap-3 text-[#6B7280] hover:border-[#316BF2]/40 hover:text-[#316BF2] transition-colors"
                >
                  <Plus size={18} />
                  <span className="text-[14px] font-medium">Ajouter une association</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
