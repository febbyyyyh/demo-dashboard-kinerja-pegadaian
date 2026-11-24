import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";

import { AdminTopbar } from "@/components/fk/AdminTopbar";
import { AppSidebar } from "@/components/fk/AppSidebar";
import { FullPageSpinner } from "@/components/fk/States";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser, useCurrentUser } from "@/lib/formkanwil/store";

export const Route = createFileRoute("/admin")({
  // Session lives in browser storage, so this area renders on the client only.
  ssr: false,
  beforeLoad: () => {
    const user = getCurrentUser();
    if (!user) throw redirect({ to: "/" });
    if (user.role !== "admin") throw redirect({ to: "/app" });
  },
  pendingComponent: FullPageSpinner,
  component: AdminLayout,
});

function AdminLayout() {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  if (!user || user.role !== "admin") return <FullPageSpinner />;

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <AdminTopbar />
        <div key={pathname} className="mx-auto w-full max-w-[90rem] animate-page-in px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
