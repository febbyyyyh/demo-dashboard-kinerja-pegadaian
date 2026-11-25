import { createFileRoute } from "@tanstack/react-router";

import { KinerjaDashboardView } from "@/components/fk/KinerjaDashboardView";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Home — Dashboard Kinerja Pegadaian" },
      {
        name: "description",
        content: "Ringkasan kinerja hari ini, outstanding loan, kualitas kredit, potensi bisnis, KPI, dan rekap kinerja harian Pegadaian.",
      },
      { property: "og:title", content: "Home — Dashboard Kinerja Pegadaian" },
      { property: "og:description", content: "Dashboard Kinerja Pegadaian Kanwil Manado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  return <KinerjaDashboardView slug="home" />;
}
