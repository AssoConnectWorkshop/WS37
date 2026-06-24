'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Circle, ArrowRight, Loader2 } from "lucide-react";
import type { CerfaProject } from "@/components/cerfa/types";
import { SECTIONS } from "@/components/cerfa/sections";

function CircularProgress({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#E5E9F2" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#316BF2" strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-[#316BF2]">
        {pct}%
      </span>
    </div>
  );
}

function sectionStatus(section: typeof SECTIONS[0], data: Record<string, unknown>) {
  const vals = section.fields.map((f) => data[f.key]);
  const filled = vals.filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length;
  if (filled === 0) return "empty";
  if (filled === vals.length) return "complete";
  return "partial";
}

function EnCours() {
  const params = useSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<CerfaProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get("id");
    const load = async () => {
      try {
        let url = "/api/cerfa/projects";
        if (id) {
          url = `/api/cerfa/projects/${id}`;
          const res = await fetch(url);
          const p = await res.json();
          if (res.ok) { setProject(p); return; }
        }
        // Get latest project
        const res = await fetch(url);
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
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#316BF2]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
          <AlertCircle size={40} className="text-amber-500 mx-auto" />
          <p className="text-[14px] text-[#1A1A2E]">{error ?? "Aucun projet trouvé."}</p>
          <button
            onClick={() => router.push("/cerfa/nouveau")}
            className="px-6 py-2.5 bg-[#316BF2] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E54D4] transition-colors"
          >
            Créer un nouveau projet
          </button>
        </div>
      </div>
    );
  }

  const data = project.data as Record<string, unknown>;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Projet en cours</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">Suivi de l&apos;avancement du formulaire Cerfa</p>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 flex flex-col md:flex-row items-center gap-6"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <CircularProgress pct={project.completion_pct} />
        <div className="flex-1 space-y-1">
          <p className="text-[18px] font-bold text-[#1A1A2E]">{project.nom_projet}</p>
          {project.nom_association && (
            <p className="text-[14px] text-[#316BF2] font-medium">{project.nom_association}</p>
          )}
          {project.financeur && (
            <p className="text-[13px] text-[#6B7280]">Financeur : {project.financeur}</p>
          )}
          <p className="text-[12px] text-[#6B7280]">
            Dernière modification : {new Date(project.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => router.push("/cerfa/nouveau")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#316BF2] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E54D4] transition-colors shrink-0"
        >
          Continuer la saisie <ArrowRight size={15} />
        </button>
      </div>

      {/* Sections status */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 space-y-3"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <h2 className="text-[15px] font-semibold text-[#1A1A2E] mb-4">Avancement par section</h2>
        {SECTIONS.map((section) => {
          const status = sectionStatus(section, data);
          const filled = section.fields.filter((f) => data[f.key] !== undefined && data[f.key] !== null && String(data[f.key]).trim() !== "").length;
          return (
            <div key={section.id} className="flex items-center gap-3 py-2.5 border-b border-[#E5E9F2] last:border-0">
              {status === "complete" ? (
                <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              ) : status === "partial" ? (
                <AlertCircle size={18} className="text-amber-500 shrink-0" />
              ) : (
                <Circle size={18} className="text-gray-300 shrink-0" />
              )}
              <span className="flex-1 text-[13px] text-[#1A1A2E]">
                Section {section.id} — {section.title}
              </span>
              <span className={`text-[12px] font-medium ${
                status === "complete" ? "text-green-600" :
                status === "partial" ? "text-amber-600" :
                "text-gray-400"
              }`}>
                {filled}/{section.fields.length} champs
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EnCoursPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#316BF2]" />
      </div>
    }>
      <EnCours />
    </Suspense>
  );
}
