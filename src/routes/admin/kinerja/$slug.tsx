import { createFileRoute } from "@tanstack/react-router";

import { KinerjaDashboardView } from "@/components/fk/KinerjaDashboardView";
import { getKinerjaPage } from "@/lib/formkanwil/kinerja";

export const Route = createFileRoute("/admin/kinerja/$slug")({
  head: ({ params }) => {
    const page = getKinerjaPage(params.slug);
    return {
      meta: [
        { title: `${page.title} — Dashboard Kinerja Pegadaian` },
        { name: "description", content: page.description },
        { property: "og:title", content: `${page.title} — Dashboard Kinerja Pegadaian` },
        { property: "og:description", content: page.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: KinerjaSlugPage,
});

function KinerjaSlugPage() {
  const { slug } = Route.useParams();
  return <KinerjaDashboardView slug={slug} />;
}
