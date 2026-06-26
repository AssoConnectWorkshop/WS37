"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";

type Radius = "department" | "region" | "national";
type Limit = 5 | 10 | 20;
type ScoreIcp = "fort" | "moyen" | "faible";

interface SimilarAssociation {
  nom: string;
  rna: string | null;
  siren: string | null;
  ville: string | null;
  departement: string | null;
  codePostal: string | null;
  objetSocial: string | null;
  raisonSuggestion: string;
  scoreIcp: ScoreIcp;
  secteur: string;
}

const SCORE_BADGE: Record<ScoreIcp, { label: string; cls: string }> = {
  fort: { label: "✅ Fort", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  moyen: { label: "🟡 Moyen", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  faible: { label: "❌ Faible", cls: "bg-red-50 text-red-600 border-red-200" },
};

const RADIUS_OPTIONS: { value: Radius; label: string }[] = [
  { value: "department", label: "📍 Même département" },
  { value: "region", label: "🗺️ Même région" },
  { value: "national", label: "🇫🇷 National" },
];

const LIMIT_OPTIONS: Limit[] = [5, 10, 20];

interface Props {
  analyzedName: string;
  onQualify: (name: string) => void;
}

export default function SimilarAssociations({ analyzedName, onQualify }: Props) {
  const [radius, setRadius] = useState<Radius>("department");
  const [limit, setLimit] = useState<Limit>(5);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [associations, setAssociations] = useState<SimilarAssociation[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const search = async () => {
    setStatus("loading");
    setAssociations([]);
    setExpanded(null);
    setError("");
    try {
      const res = await fetch("/api/prospecting/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: analyzedName, radius, limit }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json() as { associations: SimilarAssociation[] };
      setAssociations(data.associations ?? []);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  };

  const rnaUrl = (rna: string | null) =>
    rna ? `https://www.data.gouv.fr/fr/datasets/repertoire-national-des-associations/#resources` : null;

  return (
    <div
      className="bg-white border border-[#E5E9F2] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.06)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F3F4F6]">
        <h3 className="text-[14px] font-bold text-[#1A1A2E]">
          📋 Associations similaires à prospecter
        </h3>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          Basé sur le secteur et la zone géographique de {analyzedName}
        </p>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">Périmètre</p>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  radius === opt.value
                    ? "bg-[#316BF2] text-white border-[#316BF2]"
                    : "bg-white text-[#6B7280] border-[#E5E9F2] hover:border-[#316BF2]/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">Nombre</p>
          <div className="flex gap-1">
            {LIMIT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  limit === n
                    ? "bg-[#316BF2] text-white border-[#316BF2]"
                    : "bg-white text-[#6B7280] border-[#E5E9F2] hover:border-[#316BF2]/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={search}
          disabled={status === "loading"}
          className="flex items-center gap-2 px-4 py-2 bg-[#316BF2] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1E54D4] disabled:opacity-50 transition-colors ml-auto"
        >
          {status === "loading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {status === "loading" ? "Recherche…" : "Rechercher"}
        </button>
      </div>

      {/* Results */}
      {status === "loading" && (
        <div className="px-5 py-10 text-center space-y-2">
          <Loader2 size={20} className="animate-spin text-[#316BF2] mx-auto" />
          <p className="text-[13px] text-[#6B7280]">Recherche dans les APIs publiques…</p>
        </div>
      )}

      {status === "error" && (
        <div className="px-5 py-8 text-center text-[13px] text-red-500">{error}</div>
      )}

      {status === "done" && associations.length === 0 && (
        <div className="px-5 py-10 text-center text-[13px] text-[#6B7280]">
          Aucune association similaire trouvée pour ce périmètre.
        </div>
      )}

      {status === "done" && associations.length > 0 && (
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_7rem_6rem_7rem_7rem] gap-2 px-5 py-2.5 bg-[#F8FAFF] border-b border-[#F3F4F6] text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
            <span>#</span>
            <span>Nom</span>
            <span>Ville</span>
            <span>Secteur</span>
            <span>Score ICP</span>
            <span>Actions</span>
          </div>

          {associations.map((asso, i) => {
            const badge = SCORE_BADGE[asso.scoreIcp] ?? SCORE_BADGE.moyen;
            const isOpen = expanded === i;

            return (
              <div key={i} className="border-b border-[#F3F4F6] last:border-0">
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full grid grid-cols-[2rem_1fr_7rem_6rem_7rem_7rem] gap-2 px-5 py-3 items-center text-left hover:bg-[#F8FAFF] transition-colors"
                >
                  <span className="text-[12px] text-[#9CA3AF] font-medium">{i + 1}</span>
                  <span className="text-[13px] font-semibold text-[#1A1A2E] truncate pr-2">
                    {asso.nom}
                  </span>
                  <span className="text-[12px] text-[#6B7280] truncate">
                    {asso.ville ?? asso.departement ?? "—"}
                  </span>
                  <span className="text-[12px] text-[#6B7280]">{asso.secteur}</span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border w-fit ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className="flex items-center gap-1 text-[#9CA3AF]">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-[#F3F4F6] bg-[#F8FAFF] space-y-3">
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      {asso.rna && (
                        <div>
                          <p className="text-[11px] text-[#9CA3AF] font-medium uppercase mb-0.5">RNA</p>
                          <p className="text-[13px] text-[#374151] font-mono">{asso.rna}</p>
                        </div>
                      )}
                      {asso.siren && (
                        <div>
                          <p className="text-[11px] text-[#9CA3AF] font-medium uppercase mb-0.5">SIREN</p>
                          <p className="text-[13px] text-[#374151] font-mono">{asso.siren}</p>
                        </div>
                      )}
                      {asso.codePostal && (
                        <div>
                          <p className="text-[11px] text-[#9CA3AF] font-medium uppercase mb-0.5">Code postal</p>
                          <p className="text-[13px] text-[#374151]">{asso.codePostal}</p>
                        </div>
                      )}
                    </div>

                    {asso.objetSocial && (
                      <div>
                        <p className="text-[11px] text-[#9CA3AF] font-medium uppercase mb-0.5">Objet social</p>
                        <p className="text-[13px] text-[#374151] leading-relaxed">{asso.objetSocial}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] text-[#9CA3AF] font-medium uppercase mb-0.5">Pourquoi suggéré</p>
                      <p className="text-[13px] text-[#374151]">{asso.raisonSuggestion}</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onQualify(asso.nom)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#316BF2] text-white text-[12px] font-medium rounded-lg hover:bg-[#1E54D4] transition-colors"
                      >
                        <Search size={12} />
                        Lancer la préqualification
                      </button>
                      {asso.rna && (
                        <a
                          href={rnaUrl(asso.rna) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E9F2] text-[#6B7280] text-[12px] font-medium rounded-lg hover:border-[#316BF2]/40 hover:text-[#316BF2] transition-colors bg-white"
                        >
                          <ExternalLink size={12} />
                          Fiche RNA
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Export */}
          <div className="px-5 py-3 bg-[#F8FAFF] border-t border-[#F3F4F6] flex items-center justify-between">
            <p className="text-[12px] text-[#9CA3AF]">{associations.length} associations trouvées</p>
            <button
              onClick={() => {
                const header = "Nom\tVille\tDépartement\tSecteur\tScore ICP\tRNA\tSIREN\tObjet social\n";
                const rows = associations
                  .map((a) =>
                    [a.nom, a.ville ?? "", a.departement ?? "", a.secteur, a.scoreIcp, a.rna ?? "", a.siren ?? "", a.objetSocial ?? ""].join("\t")
                  )
                  .join("\n");
                const blob = new Blob([header + rows], { type: "text/tab-separated-values" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `similaires-${analyzedName.replace(/\s+/g, "-").toLowerCase()}.tsv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="text-[12px] text-[#6B7280] hover:text-[#316BF2] transition-colors"
            >
              Exporter (.tsv)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
