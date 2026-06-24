'use client';

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { FileDown, Loader2, Info, ChevronDown, ChevronUp, FileText, X } from "lucide-react";
import Link from "next/link";
import { SectionAccordion } from "@/components/cerfa/SectionAccordion";
import { DocumentUpload } from "@/components/cerfa/DocumentUpload";
import { ProjectChat } from "@/components/cerfa/ProjectChat";
import type { CerfaData, FieldSource } from "@/components/cerfa/types";
import { PROJECT_SECTIONS, SECTIONS, computeCompletion } from "@/components/cerfa/sections";

export default function NouveauProjet() {
  const router = useRouter();
  const { assoId } = useParams<{ assoId: string }>();

  const [assocData, setAssocData] = useState<CerfaData>({});
  const [projectData, setProjectData] = useState<CerfaData>({});
  const [sources, setSources] = useState<Partial<Record<keyof CerfaData, FieldSource>>>({});
  const [nomProjet, setNomProjet] = useState("");
  const [financeur, setFinanceur] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingAssoc, setLoadingAssoc] = useState(true);
  const [showUpload, setShowUpload] = useState(true);
  const [uploadDone, setUploadDone] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/cerfa/associations/${assoId}`)
      .then((r) => r.json())
      .then((d) => { if (d.data) setAssocData(d.data); })
      .finally(() => setLoadingAssoc(false));
  }, [assoId]);

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

  const handleUploadExtracted = useCallback(
    (newData: Partial<CerfaData>, newSources: Partial<Record<keyof CerfaData, FieldSource>>) => {
      mergeProjectData(newData, newSources);
      setUploadDone(true);
    },
    [mergeProjectData]
  );

  const skipUpload = () => {
    setShowUpload(false);
  };

  const generate = async () => {
    setSaving(true);
    try {
      const data = mergedData;
      const res = await fetch("/api/cerfa/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          association_id: assoId,
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
      router.push(`/${assoId}/en-cours?id=${project.id}`);
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

  const assocSections = SECTIONS.filter((s) => [1, 2, 3, 4, 5].includes(s.id));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Nouveau projet de subvention</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Remplissez les informations spécifiques à ce projet. Les données de votre association sont pré-remplies automatiquement.
        </p>
      </div>

      {/* General info */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 space-y-4"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
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

      {/* Association data notice */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${
        loadingAssoc ? "bg-[#F8FAFF] border border-[#E5E9F2]"
        : hasAssocData ? "bg-[#EEF3FE] border border-[#316BF2]/20"
        : "bg-[#FFF8E7] border border-[#F5A623]/30"
      }`}>
        {loadingAssoc
          ? <Loader2 size={16} className="mt-0.5 text-[#6B7280] animate-spin shrink-0" />
          : <Info size={16} className={`mt-0.5 shrink-0 ${hasAssocData ? "text-[#316BF2]" : "text-[#F5A623]"}`} />
        }
        <div className="text-[13px]">
          {loadingAssoc ? (
            <span className="text-[#6B7280]">Chargement des données de votre association…</span>
          ) : hasAssocData ? (
            <>
              <span className="font-medium text-[#316BF2]">Données association pré-remplies</span>
              <span className="text-[#4B5563]"> · Identification, administration, moyens humains et budget proviennent de </span>
              <Link href={`/${assoId}/association`} className="underline text-[#316BF2] hover:text-[#1E54D4]">Mon association</Link>.
            </>
          ) : (
            <>
              <span className="font-medium text-[#92400E]">Aucune donnée association enregistrée</span>
              <span className="text-[#92400E]"> · </span>
              <Link href={`/${assoId}/association`} className="underline text-[#92400E] hover:opacity-80">Renseignez votre association</Link>
              <span className="text-[#92400E]"> pour pré-remplir automatiquement vos prochains projets.</span>
            </>
          )}
        </div>
      </div>

      {/* Document upload (optional) */}
      {showUpload && !uploadDone && (
        <div className="bg-white border border-[#E5E9F2] rounded-xl p-6"
          style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Document de présentation</h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                Importez une note de présentation, un dossier de demande… pour pré-remplir le formulaire automatiquement.
              </p>
            </div>
            <button
              type="button"
              onClick={skipUpload}
              className="flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#316BF2] transition-colors shrink-0 mt-0.5"
            >
              <X size={13} /> Passer
            </button>
          </div>
          <div className="mt-4">
            <DocumentUpload context="projet" onExtracted={handleUploadExtracted} />
          </div>
        </div>
      )}

      {uploadDone && (
        <div className="flex items-center gap-3 p-4 bg-[#EEF3FE] border border-[#316BF2]/20 rounded-xl">
          <FileText size={16} className="text-[#316BF2] shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#316BF2]">Document analysé</p>
            <p className="text-[12px] text-[#4B5563]">Les informations ont été extraites et pré-remplies dans le formulaire.</p>
          </div>
          <button
            type="button"
            onClick={() => { setUploadDone(false); setShowUpload(true); }}
            className="text-[12px] text-[#316BF2] hover:underline"
          >
            Ajouter un document
          </button>
        </div>
      )}

      {/* Chat assistant */}
      {(!showUpload || uploadDone) && (
        <div className="bg-white border border-[#316BF2]/20 rounded-xl overflow-hidden"
          style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
          <div className="px-6 py-4 border-b border-[#E5E9F2] bg-[#EEF3FE] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#316BF2] animate-pulse" />
            <h2 className="text-[14px] font-semibold text-[#316BF2]">Assistant — Compléter le dossier</h2>
            <span className="ml-auto text-[12px] text-[#6B7280]">{pct}% complété</span>
          </div>
          <ProjectChat data={mergedData} onFillFields={mergeProjectData} />
        </div>
      )}

      {/* Association sections (collapsed review) */}
      {hasAssocData && (
        <div className="bg-white border border-[#E5E9F2] rounded-xl p-6"
          style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Données de l&apos;association</h2>
            <Link href={`/${assoId}/association`} className="text-[12px] text-[#316BF2] hover:underline font-medium">
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

      {/* Project form */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Formulaire Cerfa 12156*06</h2>
            <span className="text-[13px] font-semibold text-[#316BF2]">{pct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-[#E5E9F2] rounded-full h-1.5">
              <div className="bg-[#316BF2] h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            {showForm ? <ChevronUp size={16} className="text-[#6B7280]" /> : <ChevronDown size={16} className="text-[#6B7280]" />}
          </div>
        </button>

        {showForm && (
          <div className="space-y-3 mt-5">
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
        )}
      </div>

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
