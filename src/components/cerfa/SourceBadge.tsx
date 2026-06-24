import type { FieldSource } from "./types";

const CONFIG: Record<FieldSource, { label: string; className: string }> = {
  insee: { label: "INSEE / RNA", className: "bg-blue-100 text-blue-700" },
  document: { label: "Document", className: "bg-violet-100 text-violet-700" },
  manuel: { label: "Manuel", className: "bg-gray-100 text-gray-600" },
  association: { label: "Mon association", className: "bg-emerald-100 text-emerald-700" },
};

export function SourceBadge({ source }: { source: FieldSource }) {
  const cfg = CONFIG[source];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
