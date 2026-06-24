'use client';

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderOpen, Clock, Plus, Building2, ChevronLeft } from "lucide-react";
import type { CerfaAssociation } from "./types";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ assoId: string }>();
  const router = useRouter();
  const assoId = params?.assoId ?? "";
  const [asso, setAsso] = useState<CerfaAssociation | null>(null);

  useEffect(() => {
    if (!assoId) return;
    fetch(`/api/cerfa/associations/${assoId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setAsso(d));
  }, [assoId]);

  const ITEMS = [
    { href: `/${assoId}/association`, icon: Building2, label: "Mon association" },
    { href: `/${assoId}/en-cours`, icon: FolderOpen, label: "Projet en cours" },
    { href: `/${assoId}/historique`, icon: Clock, label: "Historique" },
    { href: `/${assoId}/nouveau`, icon: Plus, label: "Nouveau projet" },
  ];

  return (
    <aside className="fixed top-14 left-0 w-60 h-[calc(100vh-56px)] bg-white border-r border-[#E5E9F2] flex flex-col py-4 px-3 z-20">
      {/* Association name + switch */}
      <div className="px-3 mb-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-[11px] text-[#6B7280] hover:text-[#316BF2] transition-colors mb-2"
        >
          <ChevronLeft size={12} /> Changer d&apos;association
        </button>
        <p className="text-[13px] font-semibold text-[#1A1A2E] truncate">
          {asso?.nom ?? "…"}
        </p>
        {asso?.data?.s1_siren && (
          <p className="text-[11px] text-[#6B7280]">SIREN {asso.data.s1_siren}</p>
        )}
      </div>

      <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 mb-2">
        Navigation
      </p>
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-md text-[13px] font-medium transition-colors relative ${
                active
                  ? "bg-[#EEF3FE] text-[#316BF2]"
                  : "text-[#6B7280] hover:bg-[#F8FAFF] hover:text-[#1A1A2E]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#316BF2] rounded-r-full" />
              )}
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
