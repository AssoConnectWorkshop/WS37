'use client';

import { useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import type { CerfaData, FieldSource } from "./types";

interface Props {
  onExtracted: (data: Partial<CerfaData>, sources: Partial<Record<keyof CerfaData, FieldSource>>) => void;
}

export function DocumentUpload({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number | null>(null);

  const processFile = async (f: File) => {
    setFile(f);
    setError(null);
    setLoading(true);
    setCharCount(null);

    const form = new FormData();
    form.append("file", f);

    try {
      const res = await fetch("/api/cerfa/parse-document", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");

      const { extracted, charCount: cc } = json;
      setCharCount(cc);

      const MAPPING: Partial<Record<string, keyof CerfaData>> = {
        titre_projet: "s6_titre",
        objectif: "s6_objectif",
        description_actions: "s6_description",
        public_cible: "s6_public_cible",
        evaluation: "s6_indicateurs",
        budget_total: "s6_budget_depenses",
        etpt: "s4_salaries_etpt",
        benevoles: "s4_benevoles",
        volontaires: "s4_volontaires",
        periode_debut: "s6_periode_debut",
        periode_fin: "s6_periode_fin",
      };

      const data: Partial<CerfaData> = {};
      const sources: Partial<Record<keyof CerfaData, FieldSource>> = {};

      for (const [src, dest] of Object.entries(MAPPING)) {
        if (extracted[src] && dest) {
          (data as Record<string, string>)[dest] = extracted[src] as string;
          sources[dest] = "document";
        }
      }

      onExtracted(data, sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  return (
    <div className="space-y-3">
      <label className="text-[13px] font-semibold text-[#1A1A2E]">
        Document de présentation du projet
      </label>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragging ? "border-[#316BF2] bg-[#316BF2]/10" : "border-[#316BF2]/40 bg-[#EEF3FE] hover:bg-[#316BF2]/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        {loading ? (
          <>
            <Loader2 size={32} className="text-[#316BF2] animate-spin" />
            <p className="text-[13px] text-[#316BF2] font-medium">Analyse en cours…</p>
          </>
        ) : file && charCount !== null ? (
          <>
            <CheckCircle2 size={32} className="text-green-500" />
            <p className="text-[13px] font-semibold text-[#1A1A2E]">{file.name}</p>
            <p className="text-[12px] text-[#6B7280]">{charCount.toLocaleString("fr-FR")} caractères analysés — champs Section 6 pré-remplis</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setCharCount(null); }}
              className="absolute top-3 right-3 text-[#6B7280] hover:text-[#1A1A2E]"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <Upload size={32} className="text-[#316BF2]" />
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#316BF2]">Déposez votre document ici</p>
              <p className="text-[12px] text-[#6B7280] mt-1">ou cliquez pour parcourir — PDF ou DOCX acceptés</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[11px] text-[#6B7280] bg-white border border-[#E5E9F2] px-2 py-1 rounded">
                <FileText size={11} /> PDF
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#6B7280] bg-white border border-[#E5E9F2] px-2 py-1 rounded">
                <FileText size={11} /> DOCX
              </span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
