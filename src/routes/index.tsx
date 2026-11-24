import { createFileRoute, redirect } from "@tanstack/react-router";

/* Public-first: the app opens straight on the read-only Dashboard Overview. */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
  head: () => ({
    meta: [
      { title: "FormKanwil — Dashboard Pegadaian Kanwil Manado" },
      {
        name: "description",
        content: "Pantau Dashboard dan Daily Report PT Pegadaian Kantor Wilayah Manado.",
      },
      { property: "og:title", content: "FormKanwil — Dashboard Pegadaian Kanwil Manado" },
      { property: "og:description", content: "Pantau Dashboard dan Daily Report Kanwil Manado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
