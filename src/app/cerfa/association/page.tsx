'use client';

import { useState, useCallback, useEffect } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import { SirenSearch } from "@/components/cerfa/SirenSearch";
import { DocumentUpload } from "@/components/cerfa/DocumentUpload";
import { SectionAccordion } from "@/components/cerfa/SectionAccordion";
import type { CerfaData, FieldSource } from "@/components/cerfa/types";
import { ASSOCIATION_SECTIONS } from "@/components/cerfa/sections";

export default function MonAssociation() {
  const [data, setData] = useState<CerfaData>({});
  const [sources, setSources] = useState<Partial<Record<keyof CerfaData, FieldSource>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cerfa/association")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/cerfa/association", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Erreur lors de la sauvegarde : " + (err instanceof Error ? err.message : "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center gap-2 text-[#6B7280]">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-[13px]">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Mon association</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Ces informations sont partagées entre tous vos projets. Remplissez-les une seule fois.
        </p>
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

      {/* Association sections */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <h2 className="text-[15px] font-semibold text-[#1A1A2E] mb-6">3. Informations de l&apos;association</h2>
        <div className="space-y-3">
          {ASSOCIATION_SECTIONS.map((section, i) => (
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

      {/* Save button */}
      <div className="pb-8">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-3 py-4 bg-[#316BF2] hover:bg-[#1E54D4] disabled:opacity-60 text-white text-[15px] font-semibold rounded-xl transition-colors"
          style={{ boxShadow: "0 2px 8px rgba(49,107,242,0.25)" }}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Enregistrement…</>
          ) : saved ? (
            <><CheckCircle2 size={18} /> Enregistré !</>
          ) : (
            <><Save size={18} /> Enregistrer les informations</>
          )}
        </button>
        <p className="text-center text-[12px] text-[#6B7280] mt-2">
          Ces données seront pré-remplies automatiquement dans vos nouveaux projets.
        </p>
      </div>
    </div>
  );
}
