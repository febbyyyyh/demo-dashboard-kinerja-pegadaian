import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Home, Lock, LogOut, Moon, Palette, Search, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";

import { useAdminAccess, ViewModeBadge } from "@/components/fk/access/AdminAccess";
import { initialsOf } from "@/components/fk/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/formkanwil/auth";
import { useForms, useResponses, useThemeSettings } from "@/lib/formkanwil/hooks";
import { getKinerjaPage } from "@/lib/formkanwil/kinerja";
import { buildAdminNavigation, type NavTarget } from "@/lib/formkanwil/navigation";
import { repository } from "@/lib/formkanwil/repository";
import { resolveThemeMode } from "@/lib/formkanwil/theme";
import type { ImportedChoices } from "@/lib/formkanwil/upc-import";

/** Preserved helper for form creation routes. */
export function useQuickActions() {
  const navigate = useNavigate();
  return {
    createForm() {
      const form = repository.forms.create();
      navigate({ to: "/admin/forms/$formId", params: { formId: form.id } });
    },
    createFromUpc(choices: ImportedChoices) {
      const pageId = `page_${Date.now().toString(36)}`;
      const form = repository.forms.create({
        title: "Form Daily Report UPC",
        pages: [{ id: pageId, title: "Halaman 1" }],
        questions: [
          {
            id: `q_${Date.now().toString(36)}`,
            type: "dropdown",
            label: "Unit Pelayanan Cabang (UPC)",
            required: true,
            pageId,
            options: choices.options,
            optionMetadata: choices.optionMetadata,
            optionMetadataColumns: choices.optionMetadataColumns,
          },
        ],
      });
      toast.success(`${choices.options.length} UPC diimpor ke form baru`, {
        description: "Lanjutkan menyusun pertanyaan di Builder.",
      });
      navigate({ to: "/admin/forms/$formId", params: { formId: form.id } });
    },
  };
}

type BreadcrumbSegment = { label: string; href?: string };

function useBreadcrumbs(): BreadcrumbSegment[] {
  const { pathname } = useLocation();

  return useMemo(() => {
    const segments: BreadcrumbSegment[] = [{ label: "Home", href: "/admin" }];

    if (pathname === "/admin" || pathname === "/admin/kinerja/home") return segments;

    if (pathname.startsWith("/admin/kinerja")) {
      const slug = pathname.replace(/^\/admin\/kinerja\/?/, "").split("/")[0] || "home";
      const kinerjaPage = getKinerjaPage(slug);
      if (kinerjaPage.groupTitle) {
        segments.push({ label: kinerjaPage.groupTitle });
      }
      segments.push({ label: kinerjaPage.title });
      return segments;
    }

    if (pathname.startsWith("/admin/settings")) {
      segments.push({ label: "Pengaturan" });
      if (pathname === "/admin/settings/theme") segments.push({ label: "Tema & Branding" });
      return segments;
    }

    if (pathname === "/admin/users") {
      segments.push({ label: "Pengaturan" });
      segments.push({ label: "Akun & Akses" });
      return segments;
    }

    return segments;
  }, [pathname]);
}

export function AdminTopbar() {
  const navigate = useNavigate();
  const { user, isAdmin, openLogin } = useAdminAccess();
  const forms = useForms();
  const responses = useResponses();
  const theme = useThemeSettings();
  const resolvedMode = resolveThemeMode(theme.mode ?? "light");
  const isDark = resolvedMode === "dark";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  const toggleColorMode = () => {
    const nextMode = isDark ? "light" : "dark";
    repository.theme.save({ ...theme, mode: nextMode });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && (key === "k" || key === "f")) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => buildAdminNavigation(forms, responses, { isAdmin }), [forms, responses, isAdmin]);

  const go = (target: NavTarget) => {
    setPaletteOpen(false);
    if ("params" in target) navigate({ to: target.to, params: target.params });
    else navigate({ to: target.to });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
      <SidebarTrigger className="size-9 rounded-xl text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground" />
      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      {/* Breadcrumbs */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          {breadcrumbs.map((seg, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <BreadcrumbItem key={i}>
                {!isLast ? (
                  <>
                    {seg.href ? (
                      <BreadcrumbLink asChild>
                        <Link to={seg.href as string} className="flex items-center gap-1 text-xs font-medium">
                          {i === 0 && <Home className="size-3" />}
                          {seg.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        {seg.label}
                      </span>
                    )}
                    <BreadcrumbSeparator />
                  </>
                ) : (
                  <BreadcrumbPage className="max-w-[200px] truncate text-xs font-semibold text-foreground">
                    {seg.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Command Search */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-card transition-colors hover:border-primary/30 sm:max-w-sm"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Cari menu kinerja…</span>
        <kbd className="ml-auto hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden text-xs font-medium text-muted-foreground xl:inline">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleColorMode}
          aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          title={isDark ? "Mode Terang" : "Mode Gelap"}
          className="rounded-xl text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <ViewModeBadge className="hidden sm:inline-flex" />

        {!user && (
          <Button size="sm" className="h-9" onClick={openLogin}>
            <Lock /> <span className="hidden sm:inline">Masuk</span>
          </Button>
        )}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-xs font-bold text-primary-foreground shadow-brand"
                aria-label="Menu profil"
              >
                {initialsOf(user.name)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  {isAdmin ? (
                    <span className="pill bg-lime text-primary-deep">Admin Mode</span>
                  ) : user.assignedArea ? (
                    <span className="pill bg-gold-soft text-gold-foreground">Area {user.assignedArea}</span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
              </DropdownMenuLabel>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin/users" })}>
                    <ShieldCheck /> Akun &amp; Akses
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin/settings/theme" })}>
                    <Palette /> Tema &amp; Branding
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async () => {
                  await auth.signOut();
                  toast.info("Kamu telah keluar", { description: "Dashboard tetap bisa dilihat dalam Mode Lihat." });
                  navigate({ to: "/admin", replace: true });
                }}
              >
                <LogOut /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Cari menu kinerja, KPI, atau pengaturan…" />
        <CommandList>
          <CommandEmpty>Tidak ada yang cocok.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.id} heading={group.label}>
              {group.items.flatMap((item) =>
                item.children?.length
                  ? item.children.map((child) => (
                      <CommandItem
                        key={child.id}
                        value={`${item.label} ${child.label}`}
                        onSelect={() => go(child.link)}
                      >
                        {item.icon ? <item.icon className="size-4 text-primary" /> : null}
                        <span>
                          {item.label} / <strong>{child.label}</strong>
                        </span>
                      </CommandItem>
                    ))
                  : [
                      <CommandItem
                        key={item.id}
                        value={item.label}
                        onSelect={() => go(item.link)}
                      >
                        {item.icon ? <item.icon className="size-4 text-primary" /> : null}
                        <span>{item.label}</span>
                      </CommandItem>,
                    ],
              )}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </header>
  );
}
