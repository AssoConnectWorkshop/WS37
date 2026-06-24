'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Clock, Plus, Building2 } from "lucide-react";

const ITEMS = [
  { href: "/cerfa/association", icon: Building2, label: "Mon association" },
  { href: "/cerfa/en-cours", icon: FolderOpen, label: "Projet en cours" },
  { href: "/cerfa/historique", icon: Clock, label: "Historique" },
  { href: "/cerfa/nouveau", icon: Plus, label: "Nouveau projet" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-14 left-0 w-60 h-[calc(100vh-56px)] bg-white border-r border-[#E5E9F2] flex flex-col py-4 px-3 z-20">
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
