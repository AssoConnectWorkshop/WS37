'use client';

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { SectionAccordion } from "@/components/cerfa/SectionAccordion";
import { DocumentUpload } from "@/components/cerfa/DocumentUpload";
import type { CerfaData, FieldSource } from "@/components/cerfa/types";
import { PROJECT_SECTIONS, SECTIONS, computeCompletion } from "@/components/cerfa/sections";

export default function NouveauProjet() {
  const router = useRouter();
  const [assocData, setAssocData] = useState<CerfaData>({});
  const [projectData, setProjectData] = useState<CerfaData>({});
  const [sources, setSources] = useState<Partial<Record<keyof CerfaData, FieldSource>>>({});
  const [nomProjet, setNomProjet] = useState("");
  const [financeur, setFinanceur] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingAssoc, setLoadingAssoc] = useState(true);

  useEffect(() => {
    fetch("/api/cerfa/association")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setAssocData(d.data);
      })
      .finally(() => setLoadingAssoc(false));
  }, []);

  // Merged view for completion and form display
  const mergedData: CerfaData = useMemo(() => ({ ...assocData, ...projectData }), [assocData, projectData]);
  const pct = computeCompletion(mergedData);

  const handleFieldChange = useCallback((key: keyof CerfaData, value: string) => {
    setProjectData((d) => ({ ...d, [key]: value }));
    setSources((s) => ({ ...s, [key]: "manuel" as FieldSource }));
  }, []);

  const handleSuggest = useCallback(async (key: keyof CerfaData, fieldLabel: string, sectionTitle: string) => {
    const res = await fetch("/api/cerfa/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldKey: key, fieldLabel, sectionTitle, data: mergedData }),
    });
    if (!res.ok) throw new Error("Erreur lors de la génération");
    const { suggestion } = await res.json();
    handleFieldChange(key, suggestion);
  }, [mergedData, handleFieldChange]);

  const mergeProjectData = useCallback(
    (newData: Partial<CerfaData>, newSources: Partial<Record<keyof CerfaData, FieldSource>>) => {
      setProjectData((d) => ({ ...d, ...newData }));
      setSources((s) => ({ ...s, ...newSources }));
    },
    []
  );

  const generate = async () => {
    setSaving(true);
    try {
      const data = mergedData;
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

  const hasAssocData = Object.keys(assocData).some((k) => {
    const v = assocData[k as keyof CerfaData];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });

  // Association sections are read-only display in this page (from "Mon association")
  const assocSections = SECTIONS.filter((s) => [1, 2, 3, 4, 5].includes(s.id));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Nouveau projet de subvention</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Remplissez les informations spécifiques à ce projet. Les données de votre association sont pré-remplies automatiquement.
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

      {/* Association data banner */}
      <div
        className={`rounded-xl p-4 flex items-start gap-3 ${
          loadingAssoc
            ? "bg-[#F8FAFF] border border-[#E5E9F2]"
            : hasAssocData
            ? "bg-[#EEF3FE] border border-[#316BF2]/20"
            : "bg-[#FFF8E7] border border-[#F5A623]/30"
        }`}
      >
        {loadingAssoc ? (
          <Loader2 size={16} className="mt-0.5 text-[#6B7280] animate-spin shrink-0" />
        ) : (
          <Info size={16} className={`mt-0.5 shrink-0 ${hasAssocData ? "text-[#316BF2]" : "text-[#F5A623]"}`} />
        )}
        <div className="text-[13px]">
          {loadingAssoc ? (
            <span className="text-[#6B7280]">Chargement des données de votre association…</span>
          ) : hasAssocData ? (
            <>
              <span className="font-medium text-[#316BF2]">Données association pré-remplies</span>
              <span className="text-[#4B5563]">
                {" "}· Identification, administration, moyens humains et budget proviennent de{" "}
              </span>
              <Link href="/cerfa/association" className="underline text-[#316BF2] hover:text-[#1E54D4]">
                Mon association
              </Link>
              .
            </>
          ) : (
            <>
              <span className="font-medium text-[#92400E]">Aucune donnée association enregistrée</span>
              <span className="text-[#92400E]">
                {" "}·{" "}
              </span>
              <Link href="/cerfa/association" className="underline text-[#92400E] hover:opacity-80">
                Renseignez votre association
              </Link>
              <span className="text-[#92400E]"> pour pré-remplir automatiquement vos prochains projets.</span>
            </>
          )}
        </div>
      </div>

      {/* Association sections (read-only preview) */}
      {hasAssocData && (
        <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Données de l&apos;association</h2>
            <Link
              href="/cerfa/association"
              className="text-[12px] text-[#316BF2] hover:underline font-medium"
            >
              Modifier →
            </Link>
          </div>
          <div className="space-y-3">
            {assocSections.map((section) => (
              <SectionAccordion
                key={section.id}
                section={section}
                data={mergedData}
                sources={sources}
                onChange={handleFieldChange}
                defaultOpen={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Project document upload */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <h2 className="text-[15px] font-semibold text-[#1A1A2E] mb-1">Import du document de présentation</h2>
        <p className="text-[12px] text-[#6B7280] mb-4">
          Notes de présentation, dossiers de demande, descriptifs d&apos;actions… → pré-remplit la section 6
        </p>
        <DocumentUpload context="projet" onExtracted={mergeProjectData} />
      </div>

      {/* Progress */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Formulaire Cerfa 12156*06</h2>
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
          {PROJECT_SECTIONS.map((section, i) => (
            <SectionAccordion
              key={section.id}
              section={section}
              data={mergedData}
              sources={sources}
              onChange={handleFieldChange}
              onSuggest={handleSuggest}
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
