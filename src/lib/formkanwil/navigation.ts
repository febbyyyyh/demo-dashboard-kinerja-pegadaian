import type { LucideIcon } from "lucide-react";
import {
  Award,
  CalendarDays,
  CircleDollarSign,
  Home,
  Palette,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import type { KinerjaSlug } from "./kinerja";
import type { FeedingSlot, Form, FormResponse } from "./types";

/*
 * Schema-driven admin navigation for Dashboard Kinerja Pegadaian.
 * The sidebar, ⌘K search palette, and breadcrumbs all render from this tree.
 */
export type NavTarget =
  | { to: "/app" }
  | { to: "/admin" }
  | { to: "/admin/kinerja/$slug"; params: { slug: KinerjaSlug } }
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
  /** Edit-only destinations; hidden from visitors in Mode Lihat. */
  adminOnly?: boolean;
}

export interface NavItem extends NavLeaf {
  emoji?: string;
  feedingSlot?: FeedingSlot | null;
  /** Subtle pill label such as "Grup" for group-scoped modules. */
  lockBadge?: string;
  children?: NavLeaf[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export interface NavigationOptions {
  /** False (default) = public Mode Lihat / Area user: admin-only settings are hidden. */
  isAdmin?: boolean;
}

function kinerjaLink(slug: KinerjaSlug): NavTarget {
  return { to: "/admin/kinerja/$slug", params: { slug } };
}

export function buildAdminNavigation(
  _forms: Form[] = [],
  _responses: FormResponse[] = [],
  options: NavigationOptions = {},
): NavGroup[] {
  const groups = buildFullNavigation();
  if (options.isAdmin) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !item.adminOnly)
        .map((item) => {
          if (!item.children) return item;
          return { ...item, children: item.children.filter((child) => !child.adminOnly) };
        }),
    }))
    .filter((group) => group.items.length > 0);
}

function buildFullNavigation(): NavGroup[] {
  return [
    {
      id: "kinerja",
      label: "Menu Utama",
      items: [
        {
          id: "kinerja-home",
          label: "Home",
          icon: Home,
          path: "/admin",
          exact: true,
          link: { to: "/admin" },
        },
        {
          id: "kinerja-outstanding",
          label: "Outstanding Loan",
          icon: TrendingUp,
          path: "/admin/kinerja/outstanding",
          exact: true,
          link: kinerjaLink("outstanding"),
        },
        {
          id: "kinerja-nasabah",
          label: "Kinerja Nasabah",
          icon: Users,
          path: "/admin/kinerja/kinerja",
          exact: true,
          link: kinerjaLink("kinerja"),
        },
        {
          id: "kinerja-omset",
          label: "Omset Penyaluran",
          icon: CircleDollarSign,
          path: "/admin/kinerja/omset",
          exact: true,
          link: kinerjaLink("omset"),
        },
        {
          id: "kinerja-kualitas",
          label: "Kualitas Kredit",
          icon: ShieldAlert,
          path: "/admin/kinerja/kualitas",
          link: kinerjaLink("npl"),
          children: [
            { id: "kinerja-npl", label: "NPL", icon: ShieldAlert, path: "/admin/kinerja/npl", exact: true, link: kinerjaLink("npl") },
            { id: "kinerja-lar", label: "LaR", icon: ShieldAlert, path: "/admin/kinerja/lar", exact: true, link: kinerjaLink("lar") },
            { id: "kinerja-bjdpl", label: "BJDPL", icon: ShieldAlert, path: "/admin/kinerja/bjdpl", exact: true, link: kinerjaLink("bjdpl") },
          ],
        },
        {
          id: "kinerja-potensi",
          label: "Potensi Bisnis",
          icon: Target,
          lockBadge: "Grup",
          path: "/admin/kinerja/potensi",
          link: kinerjaLink("potensi-nasabah"),
          children: [
            { id: "kinerja-potensi-nasabah", label: "Potensi Nasabah", icon: Target, path: "/admin/kinerja/potensi-nasabah", exact: true, link: kinerjaLink("potensi-nasabah") },
            { id: "kinerja-potensi-gadai", label: "Potensi Gadai", icon: Target, path: "/admin/kinerja/potensi-gadai", exact: true, link: kinerjaLink("potensi-gadai") },
            { id: "kinerja-potensi-emas", label: "Potensi Emas", icon: Target, path: "/admin/kinerja/potensi-emas", exact: true, link: kinerjaLink("potensi-emas") },
            { id: "kinerja-potensi-wilayah", label: "Potensi Wilayah", icon: Target, path: "/admin/kinerja/potensi-wilayah", exact: true, link: kinerjaLink("potensi-wilayah") },
          ],
        },
        {
          id: "kinerja-kpi",
          label: "Key Performance Indicator",
          icon: Award,
          path: "/admin/kinerja/kpi",
          link: kinerjaLink("kpi-realisasi"),
          children: [
            { id: "kinerja-kpi-realisasi", label: "KPI Realisasi", icon: Award, path: "/admin/kinerja/kpi-realisasi", exact: true, link: kinerjaLink("kpi-realisasi") },
            { id: "kinerja-kpi-komitmen", label: "KPI Komitmen", icon: Award, path: "/admin/kinerja/kpi-komitmen", exact: true, link: kinerjaLink("kpi-komitmen") },
            { id: "kinerja-kpi-area", label: "KPI Area", icon: Award, path: "/admin/kinerja/kpi-area", exact: true, link: kinerjaLink("kpi-area") },
            { id: "kinerja-kpi-outlet", label: "KPI Outlet", icon: Award, path: "/admin/kinerja/kpi-outlet", exact: true, link: kinerjaLink("kpi-outlet") },
          ],
        },
        {
          id: "kinerja-rekap",
          label: "Rekap Kinerja Harian",
          icon: CalendarDays,
          path: "/admin/kinerja/rekap",
          exact: true,
          link: kinerjaLink("rekap"),
        },
      ],
    },
    {
      id: "system",
      label: "Pengaturan",
      items: [
        { id: "theme", label: "Tema & Branding", icon: Palette, path: "/admin/settings/theme", link: { to: "/admin/settings/theme" }, adminOnly: true },
        { id: "access", label: "Akun & Akses", icon: ShieldCheck, path: "/admin/users", link: { to: "/admin/users" }, adminOnly: true },
      ],
    },
  ];
}

export function isNavActive(pathname: string, item: Pick<NavLeaf, "path" | "exact"> & { children?: NavLeaf[] }): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (item.path === "/admin" && path === "/admin/kinerja/home") return true;
  if (item.children?.length) {
    if (item.children.some((child) => isNavActive(path, child))) return true;
  }
  return item.exact ? path === item.path : path === item.path || path.startsWith(`${item.path}/`);
}
