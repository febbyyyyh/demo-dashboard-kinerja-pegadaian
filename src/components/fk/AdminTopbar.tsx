import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Bell, CloudCheck, FileUp, LogOut, Palette, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { initialsOf } from "@/components/fk/AppSidebar";
import { UpcListImportDialog } from "@/components/fk/UpcListImportDialog";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/formkanwil/auth";
import { useCurrentUser, useForms, useIntegrations, useResponses } from "@/lib/formkanwil/hooks";
import { buildAdminNavigation, type NavTarget } from "@/lib/formkanwil/navigation";
import { repository } from "@/lib/formkanwil/repository";
import type { ImportedChoices } from "@/lib/formkanwil/upc-import";

function relative(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId });
}

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

export function AdminTopbar() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const forms = useForms();
  const responses = useResponses();
  const { settings, backups } = useIntegrations();
  const actions = useQuickActions();
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  const groups = useMemo(() => buildAdminNavigation(forms, responses), [forms, responses]);
  const latestResponses = useMemo(
    () => [...responses].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 6),
    [responses],
  );
  const lastSync = [settings.lastSyncAt, backups[0]?.at]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const go = (target: NavTarget) => {
    setPaletteOpen(false);
    if ("params" in target) navigate({ to: target.to, params: target.params });
    else navigate({ to: target.to });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
      <SidebarTrigger className="size-9 rounded-xl text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground" />
      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-card transition-colors hover:border-primary/30 sm:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Cari form, menu, atau aksi…</span>
        <kbd className="ml-auto hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div
          className="hidden items-center gap-2 rounded-xl px-2 text-xs text-muted-foreground xl:flex"
          title="Status sinkronisasi terakhir"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-glow opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <CloudCheck className="size-4" />
          {lastSync ? `Sinkron ${relative(lastSync)}` : "Belum pernah sinkron"}
        </div>

        <UpcListImportDialog
          onImport={actions.createFromUpc}
          trigger={
            <Button variant="outline" size="sm" className="hidden h-9 md:inline-flex">
              <FileUp /> Import UPC
            </Button>
          }
        />
        <Button size="sm" className="h-9" onClick={actions.createForm}>
          <Plus /> <span className="hidden sm:inline">Buat Form</span>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
              <Bell />
              {latestResponses.length > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary-glow ring-2 ring-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl p-0">
            <div className="border-b border-border px-4 py-3 text-sm font-bold">Jawaban terbaru</div>
            {latestResponses.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Belum ada jawaban masuk.
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {latestResponses.map((response) => {
                  const form = forms.find((item) => item.id === response.formId);
                  return (
                    <li key={response.id}>
                      <button
                        type="button"
                        onClick={() =>
                          form &&
                          navigate({ to: "/admin/forms/$formId/jawaban", params: { formId: form.id } })
                        }
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-mint-soft"
                      >
                        <span className="text-lg leading-none">{form?.emoji ?? "📝"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {response.respondentName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {form?.title ?? "Form terhapus"} · {relative(response.submittedAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>

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
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/admin/users" })}>
                <ShieldCheck /> Akun & Akses
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/admin/settings/theme" })}>
                <Palette /> Tema & Branding
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async () => {
                  await auth.signOut();
                  navigate({ to: "/", replace: true });
                }}
              >
                <LogOut /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Ketik nama form, kode, atau menu…" />
        <CommandList>
          <CommandEmpty>Tidak ada yang cocok.</CommandEmpty>
          <CommandGroup heading="Aksi cepat">
            <CommandItem
              onSelect={() => {
                setPaletteOpen(false);
                actions.createForm();
              }}
            >
              <Plus /> Buat form baru
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {groups
            .filter((group) => group.id !== "active-forms")
            .map((group) => (
              <CommandGroup key={group.id} heading={group.label}>
                {group.items.flatMap((item) => [item, ...(item.children ?? [])]).map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem key={item.id} value={`${group.label} ${item.label}`} onSelect={() => go(item.link)}>
                      {Icon ? <Icon /> : null} {item.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          {forms.length > 0 && (
            <CommandGroup heading="Form">
              {forms.map((form) => (
                <CommandItem
                  key={form.id}
                  value={`${form.title} ${form.code}`}
                  onSelect={() => go({ to: "/admin/forms/$formId", params: { formId: form.id } })}
                >
                  <span>{form.emoji}</span>
                  <span className="flex-1 truncate">{form.title || "Form tanpa judul"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{form.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </header>
  );
}
