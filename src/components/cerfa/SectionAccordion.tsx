'use client';

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import type { CerfaData, FieldSource, SectionMeta } from "./types";
import { SourceBadge } from "./SourceBadge";

interface Props {
  section: SectionMeta;
  data: CerfaData;
  sources: Partial<Record<keyof CerfaData, FieldSource>>;
  onChange: (key: keyof CerfaData, value: string) => void;
  defaultOpen?: boolean;
}

function sectionStatus(section: SectionMeta, data: CerfaData): "complete" | "partial" | "empty" {
  const vals = section.fields.map((f) => data[f.key]);
  const filled = vals.filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length;
  if (filled === 0) return "empty";
  if (filled === vals.length) return "complete";
  return "partial";
}

export function SectionAccordion({ section, data, sources, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const status = sectionStatus(section, data);

  const StatusIcon = status === "complete"
    ? CheckCircle2
    : status === "partial"
    ? AlertCircle
    : Circle;

  const statusColor = status === "complete"
    ? "text-green-500"
    : status === "partial"
    ? "text-amber-500"
    : "text-gray-300";

  return (
    <div className="border border-[#E5E9F2] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F8FAFF] transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon size={18} className={statusColor} />
          <span className="font-semibold text-[14px] text-[#1A1A2E]">
            Section {section.id} — {section.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#6B7280]">
            {section.fields.filter((f) => data[f.key]).length}/{section.fields.length}
          </span>
          {open ? <ChevronUp size={16} className="text-[#6B7280]" /> : <ChevronDown size={16} className="text-[#6B7280]" />}
        </div>
      </button>

      {open && (
        <div className="px-5 py-4 bg-white border-t border-[#E5E9F2] grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.fields.map((field) => {
            const value = (data[field.key] as string) ?? "";
            const source = sources[field.key];

            return (
              <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-[13px] font-medium text-[#1A1A2E]">{field.label}</label>
                  {source && <SourceBadge source={source} />}
                </div>

                {field.type === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    rows={3}
                    className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2] resize-none"
                    placeholder={`Saisir ${field.label.toLowerCase()}…`}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2] bg-white"
                  >
                    <option value="">— Sélectionner —</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#316BF2]/30 focus:border-[#316BF2]"
                    placeholder={`Saisir…`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
