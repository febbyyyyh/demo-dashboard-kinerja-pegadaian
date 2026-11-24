import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Eye, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/lib/formkanwil/hooks";
import type { User } from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";
import { LoginDialog } from "./LoginDialog";

/*
 * Role-based UI gating. Everyone sees the dashboard read-only ("Mode Lihat"); edit controls
 * render only for an admin session. This is UI gating only — real protection arrives with the
 * Cloud adapter enforcing the same rule on the server.
 */
interface AdminAccess {
  isAdmin: boolean;
  user: User | null;
  openLogin: () => void;
}

const AccessContext = createContext<AdminAccess | null>(null);

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => setOpen(true), []);
  const isAdmin = user?.role === "admin";
  const value = useMemo(() => ({ isAdmin, user: isAdmin ? user : null, openLogin }), [isAdmin, user, openLogin]);
  return (
    <AccessContext.Provider value={value}>
      {children}
      <LoginDialog open={open} onOpenChange={setOpen} />
    </AccessContext.Provider>
  );
}

export function useAdminAccess(): AdminAccess {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAdminAccess must be used inside AdminAccessProvider");
  return value;
}

/** Renders children only for admins (or `fallback` for visitors). */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{useAdminAccess().isAdmin ? children : fallback}</>;
}

/** Wraps an already-disabled control with the "Khusus Admin" tooltip. */
export function AdminOnlyHint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn("inline-flex cursor-not-allowed", className)} aria-label="Khusus Admin">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>Khusus Admin</TooltipContent>
    </Tooltip>
  );
}

export function ViewModeBadge({ className }: { className?: string }) {
  const { isAdmin } = useAdminAccess();
  return isAdmin ? (
    <span className={cn("pill bg-lime text-primary-deep", className)}>
      <ShieldCheck className="size-3" /> Admin Mode
    </span>
  ) : (
    <span className={cn("pill bg-muted text-muted-foreground", className)} title="Kamu sedang melihat versi publik (read-only)">
      <Eye className="size-3" /> Mode Lihat
    </span>
  );
}

export function AdminLockedState({ title, description }: { title: string; description?: string }) {
  const { openLogin } = useAdminAccess();
  return (
    <div className="panel mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-mint-soft text-primary">
        <Lock className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? "Halaman ini khusus admin. Data tetap bisa dipantau dari dashboard dan Daily Report."}
      </p>
      <Button className="mt-6" onClick={openLogin}>
        <ShieldCheck /> Login sebagai Admin untuk mengedit
      </Button>
    </div>
  );
}

/** Page-level guard: admin content, or the locked state with a login button. */
export function RequireAdmin({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { isAdmin } = useAdminAccess();
  if (!isAdmin) return <AdminLockedState title={title} {...(description ? { description } : {})} />;
  return <>{children}</>;
}
