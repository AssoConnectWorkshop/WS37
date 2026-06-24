'use client';

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { AlertCircle, Loader2, Save } from "lucide-react";
import type { CerfaData, CerfaProject, FieldSource } from "@/components/cerfa/types";
import { SECTIONS, computeCompletion } from "@/components/cerfa/sections";
import { DocumentUpload } from "@/components/cerfa/DocumentUpload";
import { ProjectChat } from "@/components/cerfa/ProjectChat";
import { SectionAccordion } from "@/components/cerfa/SectionAccordion";

function CircularProgress({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#E5E9F2" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#316BF2" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-[#316BF2]">{pct}%</span>
    </div>
  );
}

function EnCours() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { assoId } = useParams<{ assoId: string }>();
  const [project, setProject] = useState<CerfaProject | null>(null);
  const [sources, setSources] = useState<Partial<Record<keyof CerfaData, FieldSource>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    const load = async () => {
      try {
        if (id) {
          const res = await fetch(`/api/cerfa/projects/${id}`);
          const p = await res.json();
          if (res.ok) { setProject(p); return; }
        }
        const res = await fetch(`/api/cerfa/projects?association_id=${assoId}`);
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          setProject(list.find((p: CerfaProject) => p.statut === "en_cours") ?? list[0]);
        } else {
          setError("Aucun projet en cours. Créez un nouveau projet.");
        }
      } catch {
        setError("Erreur lors du chargement du projet.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParams, assoId]);

  const persistProject = useCallback(async (updated: CerfaProject) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/cerfa/projects/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom_projet: updated.nom_projet, nom_association: updated.nom_association, siren: updated.siren, financeur: updated.financeur, statut: updated.statut, completion_pct: updated.completion_pct, data: updated.data }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleFieldChange = useCallback((key: keyof CerfaData, value: string) => {
    setProject((prev) => {
      if (!prev) return prev;
      const newData = { ...(prev.data as CerfaData), [key]: value };
      const pct = computeCompletion(newData);
      const updated = { ...prev, data: newData, completion_pct: pct };
      persistProject(updated);
      return updated;
    });
    setSources((s) => ({ ...s, [key]: "manuel" as FieldSource }));
  }, [persistProject]);

  const mergeAndSave = useCallback(
    async (newData: Partial<CerfaData>, newSources: Partial<Record<keyof CerfaData, FieldSource>>) => {
      if (!project) return;
      const merged = { ...(project.data as CerfaData), ...newData };
      const pct = computeCompletion(merged);
      const updated = { ...project, data: merged, completion_pct: pct };
      setProject(updated);
      setSources((s) => ({ ...s, ...newSources }));
      await persistProject(updated);
    },
    [project, persistProject]
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-[#316BF2]" /></div>;

  if (error || !project) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
          <AlertCircle size={40} className="text-amber-500 mx-auto" />
          <p className="text-[14px] text-[#1A1A2E]">{error ?? "Aucun projet trouvé."}</p>
          <button
            onClick={() => router.push(`/${assoId}/nouveau`)}
            className="px-6 py-2.5 bg-[#316BF2] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E54D4] transition-colors"
          >
            Créer un nouveau projet
          </button>
        </div>
      </div>
    );
  }

  const data = project.data as CerfaData;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A2E]">Projet en cours</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">Modifiez les sections directement ou importez des documents pour enrichir le dossier.</p>
        </div>
        {(saving || saved) && (
          <div className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full ${saved ? "bg-green-50 text-green-600" : "bg-[#EEF3FE] text-[#316BF2]"}`}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? "Sauvegarde…" : "Sauvegardé"}
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 flex flex-col md:flex-row items-center gap-6"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <CircularProgress pct={project.completion_pct} />
        <div className="flex-1 space-y-1">
          <p className="text-[18px] font-bold text-[#1A1A2E]">{project.nom_projet}</p>
          {project.nom_association && <p className="text-[14px] text-[#316BF2] font-medium">{project.nom_association}</p>}
          {project.financeur && <p className="text-[13px] text-[#6B7280]">Financeur : {project.financeur}</p>}
          <p className="text-[12px] text-[#6B7280]">Mis à jour le {new Date(project.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="px-6 py-4 border-b border-[#E5E9F2] bg-[#F8FAFF]">
          <h2 className="text-[14px] font-semibold text-[#1A1A2E]">Mon Association — Import du document de présentation</h2>
          <p className="text-[12px] text-[#6B7280] mt-0.5">Bilans, comptes de résultat, CR d&apos;AG, statuts… → sections 1 à 5</p>
        </div>
        <div className="p-6"><DocumentUpload context="association" onExtracted={mergeAndSave} /></div>
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="px-6 py-4 border-b border-[#E5E9F2] bg-[#F8FAFF]">
          <h2 className="text-[14px] font-semibold text-[#1A1A2E]">Mon Projet — Import du document de présentation</h2>
          <p className="text-[12px] text-[#6B7280] mt-0.5">Notes de présentation, dossiers, descriptifs d&apos;actions… → section 6</p>
        </div>
        <div className="p-6"><DocumentUpload context="projet" onExtracted={mergeAndSave} /></div>
      </div>

      <div className="bg-white border border-[#316BF2]/20 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="px-6 py-4 border-b border-[#E5E9F2] bg-[#EEF3FE] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#316BF2] animate-pulse" />
          <h2 className="text-[14px] font-semibold text-[#316BF2]">Assistant — Compléter le dossier</h2>
          <span className="ml-auto text-[12px] text-[#6B7280]">{project.completion_pct}% complété</span>
        </div>
        <ProjectChat data={data} onFillFields={mergeAndSave} />
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6" style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#1A1A2E]">Formulaire Cerfa 12156*06</h2>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#316BF2]">{project.completion_pct}%</span>
            <span className="text-[12px] text-[#6B7280]">complété</span>
          </div>
        </div>
        <div className="w-full bg-[#E5E9F2] rounded-full h-2 mb-6">
          <div className="bg-[#316BF2] h-2 rounded-full transition-all duration-500" style={{ width: `${project.completion_pct}%` }} />
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
    </div>
  );
}

export default function EnCoursPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-[#316BF2]" /></div>}>
      <EnCours />
    </Suspense>
  );
}
