'use client';

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Loader2 } from "lucide-react";
import { SirenSearch } from "@/components/cerfa/SirenSearch";
import { DocumentUpload } from "@/components/cerfa/DocumentUpload";
import { SectionAccordion } from "@/components/cerfa/SectionAccordion";
import type { CerfaData, FieldSource } from "@/components/cerfa/types";
import { SECTIONS, computeCompletion } from "@/components/cerfa/sections";

export default function NouveauProjet() {
  const router = useRouter();
  const [data, setData] = useState<CerfaData>({});
  const [sources, setSources] = useState<Partial<Record<keyof CerfaData, FieldSource>>>({});
  const [nomProjet, setNomProjet] = useState("");
  const [financeur, setFinanceur] = useState("");
  const [saving, setSaving] = useState(false);

  const pct = computeCompletion(data);

  const mergeData = useCallback(
    (newData: Partial<CerfaData>, newSources: Partial<Record<keyof CerfaData, FieldSource>>) => {
      setData((d) => ({ ...d, ...newData }));
      setSources((s) => ({ ...s, ...newSources }));
    },
    []
  );

  const handleFieldChange = useCallback((key: keyof CerfaData, value: string) => {
    setData((d) => ({ ...d, [key]: value }));
    setSources((s) => ({ ...s, [key]: "manuel" as FieldSource }));
  }, []);

  const generate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cerfa/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom_projet: nomProjet || data.s6_titre || "Nouveau projet",
          nom_association: data.s1_raison_sociale ?? null,
          siren: data.s1_siren ?? null,
          financeur: financeur || data.s7_financeur || null,
          completion_pct: pct,
          data,
        }),
      });
      const project = await res.json();
      if (!res.ok) throw new Error(project.error);
      router.push(`/cerfa/en-cours?id=${project.id}`);
    } catch (err) {
      alert("Erreur lors de la sauvegarde : " + (err instanceof Error ? err.message : "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Nouveau projet de subvention</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Remplissez le formulaire Cerfa 12156*06 en important vos données automatiquement.
        </p>
      </div>

      {/* Project meta */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 space-y-4" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-medium text-[#1A1A2E] block mb-1">Intitulé du projet</label>
            <input
              type="text"
              value={nomProjet}
              onChange={(e) => setNomProjet(e.target.value)}
              placeholder="Ex : Programme éducatif 2026"
              className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-[#1A1A2E] block mb-1">Organisme financeur cible</label>
            <input
              type="text"
              value={financeur}
              onChange={(e) => setFinanceur(e.target.value)}
              placeholder="Ex : Région Île-de-France, DRAJES…"
              className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
            />
          </div>
        </div>
      </div>

      {/* SIREN Search */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <h2 className="text-[15px] font-semibold text-[#1A1A2E] mb-4">
          1. Identification automatique via SIREN / SIRET
        </h2>
        <SirenSearch onData={mergeData} />
      </div>

      {/* Document Upload */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <h2 className="text-[15px] font-semibold text-[#1A1A2E] mb-4">
          2. Import du document de présentation
        </h2>
        <DocumentUpload onExtracted={mergeData} />
      </div>

      {/* Progress */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[#1A1A2E]">3. Formulaire Cerfa 12156*06</h2>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#316BF2]">{pct}%</span>
            <span className="text-[12px] text-[#6B7280]">complété</span>
          </div>
        </div>
        <div className="w-full bg-[#E5E9F2] rounded-full h-2 mb-6">
          <div
            className="bg-[#316BF2] h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-3">
          {SECTIONS.map((section, i) => (
            <SectionAccordion
              key={section.id}
              section={section}
              data={data}
              sources={sources}
              onChange={handleFieldChange}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="pb-8">
        <button
          type="button"
          onClick={generate}
          disabled={saving}
          className="w-full flex items-center justify-center gap-3 py-4 bg-[#316BF2] hover:bg-[#1E54D4] disabled:opacity-60 text-white text-[15px] font-semibold rounded-xl transition-colors"
          style={{ boxShadow: "0 2px 8px rgba(49,107,242,0.25)" }}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
          ) : (
            <><FileDown size={18} /> Sauvegarder et générer le Cerfa</>
          )}
        </button>
        <p className="text-center text-[12px] text-[#6B7280] mt-2">
          Le formulaire sera sauvegardé et disponible dans &quot;Projet en cours&quot;
        </p>
      </div>
    </div>
  );
}
