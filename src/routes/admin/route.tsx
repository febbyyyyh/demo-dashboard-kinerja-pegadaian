import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { LogOut, Sparkles } from "lucide-react";

import { AdminAccessProvider, useAdminAccess } from "@/components/fk/access/AdminAccess";
import { DemoLoginGate } from "@/components/fk/access/DemoLoginGate";
import { AdminTopbar } from "@/components/fk/AdminTopbar";
import { AppSidebar } from "@/components/fk/AppSidebar";
import { FullPageSpinner } from "@/components/fk/States";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/formkanwil/auth";

/*
 * Portfolio Demo Edition: protects the dashboard behind a full-screen Login Gate
 * with a 1-click "Masuk Demo (Data Simulasi)" option for reviewers and recruiters.
 */
export const Route = createFileRoute("/admin")({
  ssr: false,
  pendingComponent: FullPageSpinner,
  component: AdminLayout,
});

function AdminShell() {
  const { pathname } = useLocation();
  const { user } = useAdminAccess();

  if (!user) {
    return <DemoLoginGate />;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-clip bg-background">
        <AdminTopbar />
        {/* Portfolio Demo Disclaimer Banner */}
        <div className="border-b border-primary/15 bg-mint-soft/75 px-3.5 py-2 text-xs text-mint-foreground sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Sparkles className="size-3.5 shrink-0 text-primary" />
              <span>
                <strong>Mode Demo Portofolio</strong> — Seluruh angka &amp; laporan yang ditampilkan merupakan{" "}
                <strong>data simulasi</strong>.
              </span>
            </span>
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-card/80 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-card"
            >
              <LogOut className="size-3" /> Keluar ke Halaman Login
            </button>
          </div>
        </div>
        <div key={pathname} className="mx-auto w-full max-w-7xl animate-page-in px-3.5 py-4 pb-16 sm:px-6 sm:py-6 sm:pb-24 lg:px-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminLayout() {
  return (
    <AdminAccessProvider>
      <AdminShell />
    </AdminAccessProvider>
  );
}
