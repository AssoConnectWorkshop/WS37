'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, ChevronRight, Loader2 } from "lucide-react";
import type { CerfaAssociation } from "@/components/cerfa/types";

export default function CerfaHome() {
  const router = useRouter();
  const [associations, setAssociations] = useState<CerfaAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [nom, setNom] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/cerfa/associations")
      .then((r) => r.json())
      .then((d) => setAssociations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!nom.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/cerfa/associations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim() }),
      });
      const asso = await res.json();
      if (!res.ok) throw new Error(asso.error);
      router.push(`/${asso.id}/association`);
    } catch (err) {
      alert("Erreur : " + (err instanceof Error ? err.message : "inconnue"));
    } finally {
      setCreating(false);
    }
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
                  <p className="text-[13px] font-semibold text-[#1A1A2E]">Nom de l&apos;association</p>
                  <input
                    type="text"
                    autoFocus
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && create()}
                    placeholder="Ex : Les Restos du Coeur Paris"
                    className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={create}
                      disabled={creating || !nom.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#316BF2] text-white text-[13px] font-medium rounded-lg hover:bg-[#1E54D4] disabled:opacity-50 transition-colors"
                    >
                      {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Creer
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setNom(""); }}
                      className="px-4 py-2 text-[#6B7280] text-[13px] font-medium rounded-lg hover:bg-[#F8FAFF] border border-[#E5E9F2] transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
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
