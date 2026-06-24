import type { ReactNode } from "react";
import { Sidebar } from "@/components/cerfa/Sidebar";

export default function AssoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFF" }}>
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-[#E5E9F2] flex items-center px-6 gap-3"
        style={{ boxShadow: "0 1px 4px rgba(49,107,242,0.08)" }}>
        <a href="/" className="font-bold text-[18px] text-[#316BF2] tracking-tight hover:opacity-80 transition-opacity">
          AssoConnect
        </a>
        <span className="w-px h-5 bg-[#E5E9F2]" />
        <span className="text-[13px] text-[#6B7280] font-medium">Générateur de Cerfa</span>
      </header>

      <div className="flex flex-1 pt-14">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-[calc(100vh-56px)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
