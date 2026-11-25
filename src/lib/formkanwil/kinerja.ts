import type { User } from "./types";

/*
 * Pure domain definitions & deterministic analytics generator for Dashboard Kinerja Pegadaian.
 * Keeps all metrics, status thresholds, 3-level Unit -> Cabang -> Area rollups,
 * Potensi Bisnis area scoping, and monthly trends pure and testable.
 */

export type KinerjaSlug =
  | "home"
  | "outstanding"
  | "kinerja"
  | "omset"
  | "npl"
  | "lar"
  | "bjdpl"
  | "potensi-nasabah"
  | "potensi-gadai"
  | "potensi-emas"
  | "potensi-wilayah"
  | "kpi-realisasi"
  | "kpi-komitmen"
  | "kpi-area"
  | "kpi-outlet"
  | "rekap";

export type KinerjaGroupId = "kualitas" | "potensi" | "kpi";

export interface KinerjaPageMeta {
  slug: KinerjaSlug;
  title: string;
  description: string;
  groupId: KinerjaGroupId | null;
  groupTitle: string | null;
  groupRestricted?: boolean;
}

export const KINERJA_PAGES: Record<KinerjaSlug, KinerjaPageMeta> = {
  home: {
    slug: "home",
    title: "Home",
    description: "Ringkasan kinerja hari ini dan perbandingannya dengan target.",
    groupId: null,
    groupTitle: null,
  },
  outstanding: {
    slug: "outstanding",
    title: "Outstanding Loan",
    description: "Posisi outstanding loan per area, cabang, dan unit.",
    groupId: null,
    groupTitle: null,
  },
  kinerja: {
    slug: "kinerja",
    title: "Kinerja Nasabah",
    description: "Perkembangan jumlah dan kualitas nasabah.",
    groupId: null,
    groupTitle: null,
  },
  omset: {
    slug: "omset",
    title: "Omset Penyaluran",
    description: "Omset penyaluran harian dan akumulasi bulan berjalan.",
    groupId: null,
    groupTitle: null,
  },
  npl: {
    slug: "npl",
    title: "NPL",
    description: "Non Performing Loan dan perubahannya dari periode sebelumnya.",
    groupId: "kualitas",
    groupTitle: "Kualitas Kredit",
  },
  lar: {
    slug: "lar",
    title: "LaR",
    description: "Loan at Risk berdasarkan umur tunggakan.",
    groupId: "kualitas",
    groupTitle: "Kualitas Kredit",
  },
  bjdpl: {
    slug: "bjdpl",
    title: "BJDPL",
    description: "Barang jaminan dalam proses lelang.",
    groupId: "kualitas",
    groupTitle: "Kualitas Kredit",
  },
  "potensi-nasabah": {
    slug: "potensi-nasabah",
    title: "Potensi Nasabah",
    description: "Pemetaan potensi pertumbuhan nasabah baru dan eksisting per wilayah.",
    groupId: "potensi",
    groupTitle: "Potensi Bisnis",
    groupRestricted: true,
  },
  "potensi-gadai": {
    slug: "potensi-gadai",
    title: "Potensi Gadai",
    description: "Identifikasi potensi transaksi gadai aktif dan peluang peningkatan omset.",
    groupId: "potensi",
    groupTitle: "Potensi Bisnis",
    groupRestricted: true,
  },
  "potensi-emas": {
    slug: "potensi-emas",
    title: "Potensi Emas",
    description: "Analisis potensi tabungan emas, cicil emas, dan investasi emas per wilayah.",
    groupId: "potensi",
    groupTitle: "Potensi Bisnis",
    groupRestricted: true,
  },
  "potensi-wilayah": {
    slug: "potensi-wilayah",
    title: "Potensi Wilayah",
    description: "Pemetaan potensi pasar dan penetrasi layanan Pegadaian di setiap wilayah.",
    groupId: "potensi",
    groupTitle: "Potensi Bisnis",
    groupRestricted: true,
  },
  "kpi-realisasi": {
    slug: "kpi-realisasi",
    title: "KPI Realisasi",
    description: "Capaian realisasi indikator kinerja utama dibandingkan target periode berjalan.",
    groupId: "kpi",
    groupTitle: "Key Performance Indicator",
  },
  "kpi-komitmen": {
    slug: "kpi-komitmen",
    title: "KPI Komitmen",
    description: "Monitoring komitmen pencapaian target kinerja oleh setiap unit kerja.",
    groupId: "kpi",
    groupTitle: "Key Performance Indicator",
  },
  "kpi-area": {
    slug: "kpi-area",
    title: "KPI Area",
    description: "Rekapitulasi skor dan pencapaian KPI pada tingkat area.",
    groupId: "kpi",
    groupTitle: "Key Performance Indicator",
  },
  "kpi-outlet": {
    slug: "kpi-outlet",
    title: "KPI Outlet",
    description: "Rincian skor dan pencapaian KPI pada tingkat cabang dan unit/outlet.",
    groupId: "kpi",
    groupTitle: "Key Performance Indicator",
  },
  rekap: {
    slug: "rekap",
    title: "Rekap Kinerja Harian",
    description: "Rekap pencapaian harian seluruh outlet dengan pilihan rincian per area, per cabang, dan per unit.",
    groupId: null,
    groupTitle: null,
  },
};

export const KINERJA_PERIODS = [
  "November 2026",
  "Oktober 2026",
  "September 2026",
  "Agustus 2026",
] as const;

export const KINERJA_AREAS = [
  "Manado",
  "Gorontalo",
  "Palu",
  "Kendari",
  "Makassar",
] as const;

export type KinerjaArea = (typeof KINERJA_AREAS)[number];

export const KINERJA_BRANCHES_BY_AREA: Record<KinerjaArea, readonly string[]> = {
  Manado: ["Cabang Manado Utama", "Cabang Bitung", "Cabang Tomohon"],
  Gorontalo: ["Cabang Gorontalo", "Cabang Limboto", "Cabang Marisa"],
  Palu: ["Cabang Palu", "Cabang Donggala", "Cabang Luwuk"],
  Kendari: ["Cabang Kendari", "Cabang Bau-Bau", "Cabang Kolaka"],
  Makassar: ["Cabang Makassar", "Cabang Panakkukang", "Cabang Maros"],
};

export const KINERJA_UNITS_BY_BRANCH: Record<string, readonly string[]> = {
  "Cabang Manado Utama": ["UPC Paal Dua", "UPC Malalayang", "UPC Tuminting"],
  "Cabang Bitung": ["UPC Girian", "UPC Madidir"],
  "Cabang Tomohon": ["UPC Tomohon Kota", "UPC Tondano"],
  "Cabang Gorontalo": ["UPC Kota Selatan", "UPC Telaga"],
  "Cabang Limboto": ["UPC Limboto Kota", "UPC Isimu"],
  "Cabang Marisa": ["UPC Marisa", "UPC Paguat"],
  "Cabang Palu": ["UPC Palu Selatan", "UPC Tadulako", "UPC Biromaru"],
  "Cabang Donggala": ["UPC Banawa", "UPC Sirenja"],
  "Cabang Luwuk": ["UPC Luwuk Kota", "UPC Kintom"],
  "Cabang Kendari": ["UPC Mandonga", "UPC Poasia"],
  "Cabang Bau-Bau": ["UPC Murhum", "UPC Wolio"],
  "Cabang Kolaka": ["UPC Kolaka Kota", "UPC Pomalaa"],
  "Cabang Makassar": ["UPC Rappocini", "UPC Somba Opu", "UPC Tamalate"],
  "Cabang Panakkukang": ["UPC Toddopuli", "UPC Antang"],
  "Cabang Maros": ["UPC Maros Kota", "UPC Batangase"],
};

export const ALL_AREAS = "Semua";
export const ALL_BRANCHES = "Semua cabang";
export const ALL_UNITS = "Semua unit";

export type KinerjaStatus = "melampaui" | "tercapai" | "peningkatan" | "belum";
export type KinerjaBreakdownLevel = "area" | "cabang" | "unit";

export interface KinerjaStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral";
  hero?: boolean;
}

export interface KinerjaTrendPoint {
  month: string;
  realisasi: number;
  target: number;
}

export interface KinerjaBreakdownRow {
  key: string;
  label: string;
  area: string;
  branch?: string;
  unit?: string;
  target: number;
  realisasi: number;
  achievement: number;
  status: KinerjaStatus;
}

export interface KinerjaSnapshot {
  page: KinerjaPageMeta;
  stats: KinerjaStat[];
  trend: KinerjaTrendPoint[];
  areaRows: KinerjaBreakdownRow[];
  branchRows: KinerjaBreakdownRow[];
  unitRows: KinerjaBreakdownRow[];
  totals: {
    target: number;
    realisasi: number;
    achievement: number;
    status: KinerjaStatus;
  };
}

export function isKinerjaSlug(value: string): value is KinerjaSlug {
  return Object.prototype.hasOwnProperty.call(KINERJA_PAGES, value);
}

export function getKinerjaPage(slug: string): KinerjaPageMeta {
  return isKinerjaSlug(slug) ? KINERJA_PAGES[slug] : KINERJA_PAGES.home;
}

export function isKinerjaArea(value: string | null | undefined): value is KinerjaArea {
  return Boolean(value) && (KINERJA_AREAS as readonly string[]).includes(value as string);
}

export function getBranchesForArea(area: string): string[] {
  if (area === ALL_AREAS || !isKinerjaArea(area)) {
    return KINERJA_AREAS.flatMap((name) => [...KINERJA_BRANCHES_BY_AREA[name]]);
  }
  return [...KINERJA_BRANCHES_BY_AREA[area]];
}

export function getUnitsForFilter(area: string, branch: string): string[] {
  const branches = getBranchesForArea(area);
  const selectedBranches =
    branch !== ALL_BRANCHES && branches.includes(branch) ? [branch] : branches;
  return selectedBranches.flatMap((name) => [...(KINERJA_UNITS_BY_BRANCH[name] ?? [])]);
}

export function classifyAchievement(pct: number): KinerjaStatus {
  if (pct >= 100) return "melampaui";
  if (pct >= 85) return "tercapai";
  if (pct >= 70) return "peningkatan";
  return "belum";
}

export const KINERJA_STATUS_LABEL: Record<KinerjaStatus, string> = {
  melampaui: "Melampaui Target",
  tercapai: "Mencapai Target",
  peningkatan: "Perlu Peningkatan",
  belum: "Belum Mencapai Target",
};

export const KINERJA_STATUS_RANGE: Record<KinerjaStatus, string> = {
  melampaui: "≥ 100%",
  tercapai: "85% – 99,9%",
  peningkatan: "70% – 84,9%",
  belum: "< 70%",
};

export function formatKinerjaNumber(value: number, maxFractionDigits = 1): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: maxFractionDigits });
}

export interface PotensiAccessPolicy {
  allowed: boolean;
  /** null = all areas permitted (Admin Kanwil); KinerjaArea = strictly scoped to a single area. */
  lockedArea: KinerjaArea | null;
  reason?: "unauthenticated" | "no_area_assigned";
}

/**
 * Pure access policy for the "Potensi Bisnis" module.
 * - Unauthenticated visitors: blocked (must sign in).
 * - Admin Kanwil: full access to all areas.
 * - Regional/Area user: access strictly scoped to their assignedArea.
 */
export function resolvePotensiAccess(user: User | null): PotensiAccessPolicy {
  if (!user || !user.active) {
    return { allowed: false, lockedArea: null, reason: "unauthenticated" };
  }
  if (user.role === "admin") {
    return { allowed: true, lockedArea: null };
  }
  if (isKinerjaArea(user.assignedArea)) {
    return { allowed: true, lockedArea: user.assignedArea };
  }
  return { allowed: false, lockedArea: null, reason: "no_area_assigned" };
}

function createSeededRng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;

export function buildKinerjaSnapshot(params: {
  slug: string;
  period: string;
  area: string;
  branch: string;
  unit?: string;
  /** When set, strictly forces all metrics, trends, and tables to this single area. */
  scopedArea?: KinerjaArea | null;
}): KinerjaSnapshot {
  const page = getKinerjaPage(params.slug);
  const effectiveArea = params.scopedArea ?? params.area;
  const allowedBranches = getBranchesForArea(effectiveArea);
  const effectiveBranch =
    params.branch !== ALL_BRANCHES && allowedBranches.includes(params.branch)
      ? params.branch
      : ALL_BRANCHES;
  const allowedUnits = getUnitsForFilter(effectiveArea, effectiveBranch);
  const requestedUnit = params.unit ?? ALL_UNITS;
  const effectiveUnit =
    requestedUnit !== ALL_UNITS && allowedUnits.includes(requestedUnit)
      ? requestedUnit
      : ALL_UNITS;

  const selectedAreas: readonly KinerjaArea[] =
    effectiveArea !== ALL_AREAS && isKinerjaArea(effectiveArea)
      ? [effectiveArea]
      : KINERJA_AREAS;

  const r = createSeededRng(
    `${page.slug}|${params.period}|${effectiveArea}|${effectiveBranch}|${effectiveUnit}`,
  );

  const stats: KinerjaStat[] = [
    {
      id: "outstanding",
      label: "Outstanding (Rp miliar)",
      value: formatKinerjaNumber(900 + r() * 400),
      delta: `+${formatKinerjaNumber(0.8 + r() * 3.8)}% vs bulan lalu`,
      tone: "positive",
      hero: true,
    },
    {
      id: "realisasi",
      label: "Realisasi (Rp miliar)",
      value: formatKinerjaNumber(40 + r() * 30),
      delta: `+${formatKinerjaNumber(1.2 + r() * 7.2)}% vs target`,
      tone: "positive",
    },
    {
      id: "nasabah",
      label: "Jumlah nasabah",
      value: Math.round(18000 + r() * 9000).toLocaleString("id-ID"),
      delta: `+${formatKinerjaNumber(0.6 + r() * 2.8)}% vs bulan lalu`,
      tone: "positive",
    },
    {
      id: "kualitas",
      label: "Rasio kualitas",
      value: `${formatKinerjaNumber(1 + r() * 2.5)}%`,
      delta: `−${formatKinerjaNumber(0.1 + r() * 0.4)} poin`,
      tone: "positive",
    },
  ];

  // Monthly Realisasi vs Target trend (Jan - Des)
  let currentVal = 62 + r() * 26;
  const trend: KinerjaTrendPoint[] = MONTHS.map((month, index) => {
    currentVal = Math.max(40, currentVal + (r() - 0.38) * 9.5);
    const targetVal = 78 + index * 1.4;
    return {
      month,
      realisasi: round1(currentVal),
      target: round1(targetVal),
    };
  });

  // Generate at Unit level first, then roll up Unit -> Cabang -> Area -> Grand Total
  const unitRows: KinerjaBreakdownRow[] = [];
  const branchRows: KinerjaBreakdownRow[] = [];
  const areaRows: KinerjaBreakdownRow[] = [];

  for (const areaName of selectedAreas) {
    const areaBranches = KINERJA_BRANCHES_BY_AREA[areaName].filter(
      (b) => effectiveBranch === ALL_BRANCHES || b === effectiveBranch,
    );

    let areaTarget = 0;
    let areaRealisasi = 0;

    for (const branchName of areaBranches) {
      const branchUnits = (KINERJA_UNITS_BY_BRANCH[branchName] ?? []).filter(
        (u) => effectiveUnit === ALL_UNITS || u === effectiveUnit,
      );
      if (branchUnits.length === 0) continue;

      let branchTarget = 0;
      let branchRealisasi = 0;

      for (const unitName of branchUnits) {
        const uRng = createSeededRng(`${page.slug}|${params.period}|${areaName}|${branchName}|${unitName}`);
        const target = round1(110 + uRng() * 95);
        const pct = 56 + uRng() * 52;
        const realisasi = round1((target * pct) / 100);
        const achievement = target > 0 ? round1((realisasi / target) * 100) : 0;

        branchTarget += target;
        branchRealisasi += realisasi;

        unitRows.push({
          key: `${areaName}::${branchName}::${unitName}`,
          label: unitName,
          area: areaName,
          branch: branchName,
          unit: unitName,
          target,
          realisasi,
          achievement,
          status: classifyAchievement(achievement),
        });
      }

      const bTarget = round1(branchTarget);
      const bRealisasi = round1(branchRealisasi);
      const bAchievement = bTarget > 0 ? round1((bRealisasi / bTarget) * 100) : 0;

      areaTarget += bTarget;
      areaRealisasi += bRealisasi;

      branchRows.push({
        key: `${areaName}::${branchName}`,
        label: branchName,
        area: areaName,
        branch: branchName,
        target: bTarget,
        realisasi: bRealisasi,
        achievement: bAchievement,
        status: classifyAchievement(bAchievement),
      });
    }

    if (areaTarget === 0 && areaRealisasi === 0) continue;

    const aTarget = round1(areaTarget);
    const aRealisasi = round1(areaRealisasi);
    const aAchievement = aTarget > 0 ? round1((aRealisasi / aTarget) * 100) : 0;

    areaRows.push({
      key: areaName,
      label: areaName,
      area: areaName,
      target: aTarget,
      realisasi: aRealisasi,
      achievement: aAchievement,
      status: classifyAchievement(aAchievement),
    });
  }

  const totalTarget = round1(areaRows.reduce((sum, row) => sum + row.target, 0));
  const totalRealisasi = round1(areaRows.reduce((sum, row) => sum + row.realisasi, 0));
  const totalAchievement = totalTarget > 0 ? round1((totalRealisasi / totalTarget) * 100) : 0;

  return {
    page,
    stats,
    trend,
    areaRows,
    branchRows,
    unitRows,
    totals: {
      target: totalTarget,
      realisasi: totalRealisasi,
      achievement: totalAchievement,
      status: classifyAchievement(totalAchievement),
    },
  };
}
