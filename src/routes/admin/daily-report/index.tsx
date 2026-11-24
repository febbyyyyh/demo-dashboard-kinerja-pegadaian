import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/daily-report/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/daily-report/indikator" });
  },
});
