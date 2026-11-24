import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  DatabaseBackup,
  FileStack,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  Palette,
  PencilRuler,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";

import type { FeedingSlot, Form, FormResponse } from "./types";

/*
 * Schema-driven admin navigation. The sidebar, the ⌘K palette and breadcrumbs all render
 * from this tree, and the "FORM AKTIF" group is derived from the Form objects.
 */
export type NavTarget =
  | { to: "/admin" }
  | { to: "/admin/daily-report/indikator" }
  | { to: "/admin/daily-report/area" }
  | { to: "/admin/daily-report/cabang" }
  | { to: "/admin/daily-report/unit" }
  | { to: "/admin/daily-report/config" }
  | { to: "/admin/forms" }
  | { to: "/admin/settings/theme" }
  | { to: "/admin/settings/integrasi" }
  | { to: "/admin/users" }
  | { to: "/admin/forms/$formId"; params: { formId: string } }
  | { to: "/admin/forms/$formId/jawaban"; params: { formId: string } }
  | { to: "/admin/forms/$formId/pengaturan"; params: { formId: string } };

export interface NavLeaf {
  id: string;
  label: string;
  icon: LucideIcon | null;
  /** Pathname used for active matching. */
  path: string;
  exact?: boolean;
  link: NavTarget;
  badge?: string | number;
}

export interface NavItem extends NavLeaf {
  emoji?: string;
  feedingSlot?: FeedingSlot | null;
  children?: NavLeaf[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export function buildAdminNavigation(forms: Form[], responses: FormResponse[]): NavGroup[] {
  const activeForms = forms
    .filter((form) => form.active)
    .sort((a, b) => (a.feedingSlot ?? 9) - (b.feedingSlot ?? 9) || b.updatedAt.localeCompare(a.updatedAt));
  const responseCount = new Map<string, number>();
  for (const response of responses) {
    responseCount.set(response.formId, (responseCount.get(response.formId) ?? 0) + 1);
  }

  return [
    {
      id: "main",
      label: "Menu Utama",
      items: [
        {
          id: "dashboard",
          label: "Dashboard Overview",
          icon: LayoutDashboard,
          path: "/admin",
          exact: true,
          link: { to: "/admin" },
        },
        {
          id: "daily-report",
          label: "Daily Report",
          icon: CalendarCheck2,
          path: "/admin/daily-report",
          link: { to: "/admin/daily-report/indikator" },
          children: [
            { id: "dr-indikator", label: "Kartu Indikator", icon: Gauge, path: "/admin/daily-report/indikator", link: { to: "/admin/daily-report/indikator" } },
            { id: "dr-area", label: "Rekap Area", icon: MapIcon, path: "/admin/daily-report/area", link: { to: "/admin/daily-report/area" } },
            { id: "dr-cabang", label: "Rekap Cabang", icon: Building2, path: "/admin/daily-report/cabang", link: { to: "/admin/daily-report/cabang" } },
            { id: "dr-unit", label: "Kinerja Unit", icon: Trophy, path: "/admin/daily-report/unit", link: { to: "/admin/daily-report/unit" } },
            { id: "dr-config", label: "Konfigurasi Daily Report", icon: SlidersHorizontal, path: "/admin/daily-report/config", link: { to: "/admin/daily-report/config" } },
          ],
        },
        {
          id: "forms",
          label: "Kelola Form",
          icon: FileStack,
          path: "/admin/forms",
          exact: true,
          link: { to: "/admin/forms" },
          badge: forms.length,
        },
      ],
    },
    {
      id: "active-forms",
      label: "Form Aktif",
      items: activeForms.map((form) => ({
        id: `form-${form.id}`,
        label: form.title || "Form tanpa judul",
        emoji: form.emoji,
        feedingSlot: form.feedingSlot ?? null,
        icon: null,
        path: `/admin/forms/${form.id}`,
        link: { to: "/admin/forms/$formId", params: { formId: form.id } },
        children: [
          { id: `form-${form.id}-builder`, label: "Builder", icon: PencilRuler, path: `/admin/forms/${form.id}`, exact: true, link: { to: "/admin/forms/$formId", params: { formId: form.id } } },
          { id: `form-${form.id}-jawaban`, label: "Jawaban", icon: BarChart3, path: `/admin/forms/${form.id}/jawaban`, link: { to: "/admin/forms/$formId/jawaban", params: { formId: form.id } }, badge: responseCount.get(form.id) ?? 0 },
          { id: `form-${form.id}-settings`, label: "Pengaturan", icon: Settings2, path: `/admin/forms/${form.id}/pengaturan`, link: { to: "/admin/forms/$formId/pengaturan", params: { formId: form.id } } },
        ],
      })),
    },
    {
      id: "system",
      label: "Sistem & Integrasi",
      items: [
        { id: "theme", label: "Tema & Branding", icon: Palette, path: "/admin/settings/theme", link: { to: "/admin/settings/theme" } },
        { id: "integrations", label: "Integrasi & Backup", icon: DatabaseBackup, path: "/admin/settings/integrasi", link: { to: "/admin/settings/integrasi" } },
        { id: "access", label: "Akun & Akses", icon: ShieldCheck, path: "/admin/users", link: { to: "/admin/users" } },
      ],
    },
  ];
}

export function isNavActive(pathname: string, item: Pick<NavLeaf, "path" | "exact">): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return item.exact ? path === item.path : path === item.path || path.startsWith(`${item.path}/`);
}
