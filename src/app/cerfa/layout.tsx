import type { ReactNode } from "react";
import { Sidebar } from "@/components/cerfa/Sidebar";

export const metadata = {
  title: "Générateur Cerfa 12156 — AssoConnect",
  description: "Pré-remplissage automatique du formulaire Cerfa 12156*06 de demande de subvention",
};

export default function CerfaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFF" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#E5E9F2] flex items-center px-6 gap-3"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[18px] text-[#316BF2] tracking-tight">AssoConnect</span>
          <span className="w-px h-5 bg-[#E5E9F2]" />
          <span className="text-[13px] text-[#6B7280] font-medium">Générateur de Cerfa</span>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar */}
        <Sidebar />

        {/* Main */}
        <main className="flex-1 ml-60 min-h-[calc(100vh-56px)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
