import type { Metadata } from "next";
import ProspectingAgent from "@/components/prospecting/ProspectingAgent";

export const metadata: Metadata = {
  title: "QualifBot — Préqualification AssoConnect",
  description: "Préqualifiez un compte prospect en moins de 10 minutes.",
};

export default function ProspectingPage() {
  return <ProspectingAgent />;
}
