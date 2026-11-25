import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/kinerja/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/kinerja/$slug", params: { slug: "home" } });
  },
});
