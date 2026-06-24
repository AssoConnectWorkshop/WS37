'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Download, Copy, Loader2, AlertCircle, Filter } from "lucide-react";
import type { CerfaProject } from "@/components/cerfa/types";

function StatusBadge({ statut }: { statut: string }) {
  return statut === "genere" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Généré
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> En cours
    </span>
  );
}

export default function Historique() {
  const router = useRouter();
  const { assoId } = useParams<{ assoId: string }>();
  const [projects, setProjects] = useState<CerfaProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("tous");

  useEffect(() => {
    fetch(`/api/cerfa/projects?association_id=${assoId}`)
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [assoId]);

  const duplicate = async (p: CerfaProject) => {
    const res = await fetch("/api/cerfa/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        association_id: assoId,
        nom_projet: `${p.nom_projet} (copie)`,
        nom_association: p.nom_association,
        siren: p.siren,
        financeur: p.financeur,
        completion_pct: p.completion_pct,
        data: p.data,
      }),
    });
    const newP = await res.json();
    if (res.ok) setProjects((prev) => [newP, ...prev]);
  };

  const filtered = projects.filter((p) => {
    const matchSearch = !search
      || p.nom_projet?.toLowerCase().includes(search.toLowerCase())
      || p.nom_association?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "tous" || p.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A2E]">Historique des projets</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">Tous vos dossiers Cerfa enregistrés</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 border border-[#E5E9F2] rounded-lg px-3 py-2.5 bg-white">
          <Filter size={14} className="text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par projet…"
            className="flex-1 text-[13px] text-[#1A1A2E] outline-none bg-transparent"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="border border-[#E5E9F2] rounded-lg px-3 py-2.5 text-[13px] text-[#1A1A2E] bg-white focus:outline-none focus:border-[#316BF2]"
        >
          <option value="tous">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="genere">Généré</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={28} className="animate-spin text-[#316BF2]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <AlertCircle size={40} className="text-[#E5E9F2] mx-auto" />
          <p className="text-[14px] text-[#6B7280]">
            {projects.length === 0 ? "Aucun projet enregistré." : "Aucun projet ne correspond aux filtres."}
          </p>
          {projects.length === 0 && (
            <button
              onClick={() => router.push(`/${assoId}/nouveau`)}
              className="px-6 py-2.5 bg-[#316BF2] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E54D4]"
            >
              Créer un premier projet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id}
              className="bg-white border border-[#E5E9F2] rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-[#316BF2]/30 transition-colors"
              style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.06)" }}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-semibold text-[#1A1A2E] truncate">{p.nom_projet}</p>
                  <StatusBadge statut={p.statut} />
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[#6B7280] flex-wrap">
                  {p.financeur && <span>Financeur : {p.financeur}</span>}
                  <span>·</span>
                  <span>{new Date(p.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span>·</span>
                  <span className="text-[#316BF2] font-medium">{p.completion_pct}% complété</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/${assoId}/en-cours?id=${p.id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#316BF2] text-[#316BF2] text-[12px] font-medium rounded-lg hover:bg-[#EEF3FE] transition-colors"
                >
                  <Download size={13} /> Ouvrir
                </button>
                <button
                  onClick={() => duplicate(p)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[#6B7280] text-[12px] font-medium rounded-lg hover:bg-[#F8FAFF] hover:text-[#1A1A2E] transition-colors border border-[#E5E9F2]"
                >
                  <Copy size={13} /> Dupliquer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
