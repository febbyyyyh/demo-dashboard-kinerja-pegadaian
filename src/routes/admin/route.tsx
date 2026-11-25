import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { AdminAccessProvider } from "@/components/fk/access/AdminAccess";
import { AdminTopbar } from "@/components/fk/AdminTopbar";
import { AppSidebar } from "@/components/fk/AppSidebar";
import { FullPageSpinner } from "@/components/fk/States";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/*
 * Public-first dashboard: everyone can view (Mode Lihat); edit controls and admin-only pages
 * are gated in the UI by AdminAccessProvider. Data lives in browser storage, so render on the
 * client only.
 */
export const Route = createFileRoute("/admin")({
  ssr: false,
  pendingComponent: FullPageSpinner,
  component: AdminLayout,
});

function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <AdminAccessProvider>
      <SidebarProvider style={{ "--sidebar-width": "17.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-x-clip bg-background">
          <AdminTopbar />
          <div key={pathname} className="mx-auto w-full max-w-7xl animate-page-in px-3.5 py-4 pb-16 sm:px-6 sm:py-6 sm:pb-24 lg:px-8">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminAccessProvider>
  );
}
