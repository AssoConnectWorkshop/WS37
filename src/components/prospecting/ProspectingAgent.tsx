"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Loader2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import SimilarAssociations from "./SimilarAssociations";

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-[15px] font-bold text-[#1A1A2E] mt-6 mb-2 flex items-center gap-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[17px] font-bold text-[#1A1A2E] mt-8 mb-3">$1</h2>')
    .replace(/^---$/gm, '<hr class="border-[#E5E9F2] my-6"/>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#1A1A2E]">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[13px] text-[#374151] mb-1 flex gap-2"><span class="text-[#316BF2] mt-0.5">•</span><span>$1</span></li>')
    .replace(/(<li[\s\S]*?<\/li>)+/g, '<ul class="space-y-0.5 my-2">$&</ul>')
    .replace(/^(?!<[hul]|<hr)(.+)$/gm, (match) => {
      const trimmed = match.trim();
      if (!trimmed) return "";
      return `<p class="text-[13px] text-[#374151] leading-relaxed mb-2">${trimmed}</p>`;
    })
    .replace(/\n{3,}/g, "\n\n");
}

const EXAMPLES = [
  "Fédération Française de Tennis",
  "Les Restos du Coeur",
  "Scouts et Guides de France",
  "France Alzheimer",
  "Médecins Sans Frontières",
];

export default function ProspectingAgent() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  const qualify = useCallback(async (name: string) => {
    if (!name.trim()) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setCurrentName(name.trim());
    setStatus("loading");
    setResult("");
    setError("");
    setExpanded({});

    try {
      const res = await fetch("/api/prospecting/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? `Erreur ${res.status}`);
      }

      setStatus("streaming");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setResult((prev) => prev + decoder.decode(value, { stream: true }));
      }

      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message ?? "Erreur inconnue");
      setStatus("error");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    qualify(query);
  };

  const reset = () => {
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setResult("");
    setError("");
    setQuery("");
    setCurrentName("");
  };

  const sections = result
    .split(/(?=### )/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sectionTitles = sections.map((s) => {
    const match = s.match(/^### (.+)/);
    return match ? match[1] : "";
  });

  const toggleSection = (i: number) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFF" }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#E5E9F2] flex items-center px-6 gap-3"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}
      >
        <span className="font-bold text-[18px] text-[#316BF2] tracking-tight">AssoConnect</span>
        <span className="w-px h-5 bg-[#E5E9F2]" />
        <span className="text-[13px] text-[#6B7280] font-medium">Outil de Préqualification</span>
        {(status === "done" || status === "streaming" || status === "error") && (
          <>
            <span className="flex-1" />
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#6B7280] hover:text-[#316BF2] hover:bg-[#EEF3FE] rounded-lg transition-colors"
            >
              <RotateCcw size={13} />
              Nouvelle recherche
            </button>
          </>
        )}
      </header>

      <main className="flex-1 pt-14">
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6 pb-16">
            <div className="w-full max-w-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-[#EEF3FE] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-[#316BF2]" />
                </div>
                <h1 className="text-[26px] font-bold text-[#1A1A2E]">QualifBot</h1>
                <p className="text-[14px] text-[#6B7280] max-w-sm mx-auto">
                  Préqualifiez un compte prospect en moins de 10 minutes grâce à l&apos;IA et aux données publiques françaises.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nom de l'association à préqualifier…"
                  className="w-full border border-[#E5E9F2] rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2] bg-white"
                  style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.06)" }}
                />
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="w-full bg-[#316BF2] text-white text-[14px] font-semibold py-3 rounded-xl hover:bg-[#1E54D4] disabled:opacity-40 transition-colors"
                >
                  Lancer la préqualification
                </button>
              </form>

              <div className="space-y-2">
                <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide font-medium">Exemples</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => { setQuery(ex); qualify(ex); }}
                      className="px-3 py-1.5 bg-white border border-[#E5E9F2] rounded-lg text-[12px] text-[#6B7280] hover:border-[#316BF2]/40 hover:text-[#316BF2] transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {(status === "loading" || status === "streaming" || status === "done") && (
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
            {/* Account header */}
            <div
              className="bg-white border border-[#E5E9F2] rounded-2xl p-5 flex items-center gap-4"
              style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.06)" }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#EEF3FE] flex items-center justify-center text-2xl shrink-0">
                🏛️
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-bold text-[#1A1A2E] truncate">{currentName}</h2>
                <p className="text-[12px] text-[#6B7280] mt-0.5">Fiche de préqualification</p>
              </div>
              {status === "loading" && (
                <div className="flex items-center gap-2 text-[#316BF2]">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[12px]">Recherche des données…</span>
                </div>
              )}
              {status === "streaming" && (
                <div className="flex items-center gap-2 text-[#316BF2]">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[12px]">Analyse en cours…</span>
                </div>
              )}
              {status === "done" && (
                <span className="text-[12px] text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg">
                  ✓ Analyse complète
                </span>
              )}
            </div>

            {/* Sections accordions */}
            {status === "streaming" && sections.length === 0 && (
              <div className="bg-white border border-[#E5E9F2] rounded-2xl p-6 text-center">
                <Loader2 size={20} className="animate-spin text-[#316BF2] mx-auto mb-2" />
                <p className="text-[13px] text-[#6B7280]">Génération de la fiche en cours…</p>
              </div>
            )}

            {sections.map((section, i) => {
              const isOpen = expanded[i] !== false; // open by default
              const content = section.replace(/^### .+\n/, "");
              const isRecommendation = sectionTitles[i]?.includes("Recommandation");

              return (
                <div
                  key={i}
                  className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${
                    isRecommendation
                      ? "border-[#316BF2]/30"
                      : "border-[#E5E9F2]"
                  }`}
                  style={{
                    boxShadow: isRecommendation
                      ? "0 2px 8px rgba(49,107,242,0.12)"
                      : "0 1px 4px rgba(49,107,242,0.06)",
                  }}
                >
                  <button
                    onClick={() => toggleSection(i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F8FAFF] transition-colors"
                  >
                    <span
                      className={`text-[14px] font-semibold ${
                        isRecommendation ? "text-[#316BF2]" : "text-[#1A1A2E]"
                      }`}
                    >
                      {sectionTitles[i]}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-[#9CA3AF] shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-[#9CA3AF] shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div
                      className="px-5 pb-5 border-t border-[#F3F4F6]"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                    />
                  )}
                </div>
              );
            })}

            {/* Streaming cursor */}
            {status === "streaming" && sections.length > 0 && (
              <div className="h-4 flex items-center">
                <span className="w-2 h-4 bg-[#316BF2] rounded animate-pulse" />
              </div>
            )}

            {/* Raw text while no sections parsed yet (streaming start) */}
            {status === "streaming" && sections.length === 0 && result && (
              <div className="bg-white border border-[#E5E9F2] rounded-2xl p-5">
                <pre className="text-[13px] text-[#374151] whitespace-pre-wrap font-sans">{result}</pre>
              </div>
            )}

            {/* Actions when done */}
            {status === "done" && (
              <>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([result], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `qualif-${currentName.replace(/\s+/g, "-").toLowerCase()}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-[#E5E9F2] rounded-xl text-[13px] text-[#6B7280] hover:border-[#316BF2]/40 hover:text-[#316BF2] transition-colors bg-white"
                  >
                    Exporter (.md)
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-[#E5E9F2] rounded-xl text-[13px] text-[#6B7280] hover:border-[#316BF2]/40 hover:text-[#316BF2] transition-colors bg-white"
                  >
                    Copier le texte
                  </button>
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-2 bg-[#316BF2] text-white rounded-xl text-[13px] font-medium hover:bg-[#1E54D4] transition-colors ml-auto"
                  >
                    <RotateCcw size={13} />
                    Nouveau compte
                  </button>
                </div>

                <SimilarAssociations
                  analyzedName={currentName}
                  onQualify={(name) => {
                    setQuery(name);
                    qualify(name);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </>
            )}

          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6">
            <div className="bg-white border border-red-100 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <h2 className="text-[16px] font-bold text-[#1A1A2E]">Erreur</h2>
              <p className="text-[13px] text-[#6B7280]">{error}</p>
              <button
                onClick={reset}
                className="px-6 py-2.5 bg-[#316BF2] text-white text-[13px] font-semibold rounded-xl hover:bg-[#1E54D4] transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
