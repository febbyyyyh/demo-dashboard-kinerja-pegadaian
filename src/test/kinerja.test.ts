import { describe, expect, it, vi } from "vitest";

import {
  ALL_AREAS,
  ALL_BRANCHES,
  ALL_UNITS,
  buildKinerjaSnapshot,
  classifyAchievement,
  getBranchesForArea,
  getUnitsForFilter,
  KINERJA_AREAS,
  KINERJA_PAGES,
  KINERJA_PERIODS,
  resolvePotensiAccess,
} from "@/lib/formkanwil/kinerja";
import { buildAdminNavigation } from "@/lib/formkanwil/navigation";
import { createDefaultTheme, createInitialDatabase } from "@/lib/formkanwil/seed";
import { applyTheme } from "@/lib/formkanwil/theme";
import type { User } from "@/lib/formkanwil/types";

describe("Dashboard Kinerja domain, Unit/Cabang/Area rollups & access control", () => {
  it("exposes only the exact Dashboard Kinerja menu (8 items) for visitors and adds Pengaturan for admin", () => {
    expect(Object.keys(KINERJA_PAGES)).toHaveLength(16);

    const visitorGroups = buildAdminNavigation([], [], { isAdmin: false });
    expect(visitorGroups.map((g) => g.id)).toEqual(["kinerja"]);
    expect(visitorGroups[0]?.items).toHaveLength(8);
    expect(visitorGroups[0]?.items.map((i) => i.label)).toEqual([
      "Home",
      "Outstanding Loan",
      "Kinerja Nasabah",
      "Omset Penyaluran",
      "Kualitas Kredit",
      "Potensi Bisnis",
      "Key Performance Indicator",
      "Rekap Kinerja Harian",
    ]);

    const potensi = visitorGroups[0]?.items.find((i) => i.id === "kinerja-potensi");
    expect(potensi?.lockBadge).toBe("Grup");
    expect(potensi?.children).toHaveLength(4);

    const adminGroups = buildAdminNavigation([], [], { isAdmin: true });
    expect(adminGroups.map((g) => g.id)).toEqual(["kinerja", "system"]);
    expect(adminGroups[1]?.items.map((i) => i.id)).toEqual(["theme", "access"]);
  });

  it("classifies achievement status using formal 100%, 85%, and 70% thresholds", () => {
    expect(classifyAchievement(105)).toBe("melampaui");
    expect(classifyAchievement(100)).toBe("melampaui");
    expect(classifyAchievement(92)).toBe("tercapai");
    expect(classifyAchievement(85)).toBe("tercapai");
    expect(classifyAchievement(75)).toBe("peningkatan");
    expect(classifyAchievement(70)).toBe("peningkatan");
    expect(classifyAchievement(69.9)).toBe("belum");
  });

  it("rolls up Unit -> Cabang -> Area -> Grand Total with mathematical consistency", () => {
    const snap = buildKinerjaSnapshot({
      slug: "rekap",
      period: KINERJA_PERIODS[0],
      area: ALL_AREAS,
      branch: ALL_BRANCHES,
      unit: ALL_UNITS,
    });

    expect(snap.areaRows).toHaveLength(KINERJA_AREAS.length);
    expect(snap.branchRows).toHaveLength(getBranchesForArea(ALL_AREAS).length);
    expect(snap.unitRows).toHaveLength(getUnitsForFilter(ALL_AREAS, ALL_BRANCHES).length);
    expect(snap.trend).toHaveLength(12);
    expect(snap.stats).toHaveLength(4);

    // Every branch equals the sum of its units
    for (const branchRow of snap.branchRows) {
      const units = snap.unitRows.filter((u) => u.branch === branchRow.branch);
      const sumTarget = Math.round(units.reduce((acc, u) => acc + u.target, 0) * 10) / 10;
      const sumRealisasi = Math.round(units.reduce((acc, u) => acc + u.realisasi, 0) * 10) / 10;
      expect(branchRow.target).toBe(sumTarget);
      expect(branchRow.realisasi).toBe(sumRealisasi);
    }

    // Every area equals the sum of its branches
    for (const areaRow of snap.areaRows) {
      const branches = snap.branchRows.filter((b) => b.area === areaRow.area);
      const sumTarget = Math.round(branches.reduce((acc, b) => acc + b.target, 0) * 10) / 10;
      const sumRealisasi = Math.round(branches.reduce((acc, b) => acc + b.realisasi, 0) * 10) / 10;
      expect(areaRow.target).toBe(sumTarget);
      expect(areaRow.realisasi).toBe(sumRealisasi);
    }

    // Grand total equals sum of areas
    const totalTarget = Math.round(snap.areaRows.reduce((acc, a) => acc + a.target, 0) * 10) / 10;
    const totalRealisasi = Math.round(snap.areaRows.reduce((acc, a) => acc + a.realisasi, 0) * 10) / 10;
    expect(snap.totals.target).toBe(totalTarget);
    expect(snap.totals.realisasi).toBe(totalRealisasi);
  });

  it("filters cleanly by Area, Cabang, and Unit", () => {
    const manadoBranches = getBranchesForArea("Manado");
    const firstBranch = manadoBranches[0]!;
    const branchUnits = getUnitsForFilter("Manado", firstBranch);
    const firstUnit = branchUnits[0]!;

    const unitSnap = buildKinerjaSnapshot({
      slug: "rekap",
      period: KINERJA_PERIODS[0],
      area: "Manado",
      branch: firstBranch,
      unit: firstUnit,
    });
    expect(unitSnap.areaRows).toHaveLength(1);
    expect(unitSnap.branchRows).toHaveLength(1);
    expect(unitSnap.unitRows).toHaveLength(1);
    expect(unitSnap.unitRows[0]?.label).toBe(firstUnit);
    expect(unitSnap.totals.target).toBe(unitSnap.unitRows[0]?.target);
  });

  it("applies dark and light mode while preserving custom brand colors", () => {
    const root = document.createElement("html");
    const theme = { ...createDefaultTheme(), preset: "custom" as const, customPrimary: "#1D4ED8", mode: "dark" as const };
    applyTheme(theme, root);
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset["theme"]).toBe("dark");
    expect(root.style.getPropertyValue("--primary")).toBe("#1D4ED8");

    applyTheme({ ...theme, mode: "light" }, root);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset["theme"]).toBe("light");
    expect(root.style.getPropertyValue("--primary")).toBe("#1D4ED8");
  });

  it("enforces Potensi Bisnis area scoping across Area, Cabang, and Unit rows", () => {
    const admin = createInitialDatabase().users[0]!;
    const manadoUser: User = {
      id: "usr_mnd",
      username: "area.manado",
      name: "Tim Area Manado",
      email: "area.manado@kanwil.pegadaian.co.id",
      role: "user",
      assignedArea: "Manado",
      active: true,
      createdAt: new Date(0).toISOString(),
    };
    const unassignedUser: User = { ...manadoUser, id: "usr_none", assignedArea: null };

    expect(resolvePotensiAccess(null)).toEqual({ allowed: false, lockedArea: null, reason: "unauthenticated" });
    expect(resolvePotensiAccess(admin)).toEqual({ allowed: true, lockedArea: null });
    expect(resolvePotensiAccess(manadoUser)).toEqual({ allowed: true, lockedArea: "Manado" });
    expect(resolvePotensiAccess(unassignedUser)).toEqual({ allowed: false, lockedArea: null, reason: "no_area_assigned" });

    // Even when requesting another area/branch/unit, scopedArea isolates everything to Manado
    const scoped = buildKinerjaSnapshot({
      slug: "potensi-emas",
      period: KINERJA_PERIODS[0],
      area: "Makassar",
      branch: "Cabang Makassar",
      unit: "UPC Rappocini",
      scopedArea: "Manado",
    });
    expect(scoped.areaRows).toHaveLength(1);
    expect(scoped.areaRows[0]?.area).toBe("Manado");
    expect(scoped.branchRows.every((b) => b.area === "Manado")).toBe(true);
    expect(scoped.unitRows.every((u) => u.area === "Manado")).toBe(true);
  });

  it("creates, seeds, and signs in area accounts with salted hashed passwords", async () => {
    vi.resetModules();
    const { auth: freshAuth, DEMO_AREA_PASSWORD } = await import("@/lib/formkanwil/auth");
    const { getDb } = await import("@/lib/formkanwil/store");
    try {
      const seeded = await freshAuth.seedDemoAreaUsers();
      expect(seeded.created).toBe(KINERJA_AREAS.length);

      const paluAccount = getDb().users.find((u) => u.username === "area.palu");
      expect(paluAccount?.assignedArea).toBe("Palu");
      expect(paluAccount?.role).toBe("user");
      expect(JSON.stringify(paluAccount)).not.toContain(DEMO_AREA_PASSWORD);

      const signIn = await freshAuth.signIn({ username: "area.palu", password: DEMO_AREA_PASSWORD });
      expect(signIn).toMatchObject({ ok: true, user: { username: "area.palu", assignedArea: "Palu" } });
      await freshAuth.signOut();
    } finally {
      sessionStorage.clear();
      localStorage.clear();
    }
  });

  it("auto-provisions demo area accounts on first sign-in without requiring admin setup first", async () => {
    vi.resetModules();
    const { auth: freshAuth, DEMO_AREA_PASSWORD } = await import("@/lib/formkanwil/auth");
    try {
      const bad = await freshAuth.signIn({ username: "area.manado", password: "wrongpassword" });
      expect(bad.ok).toBe(false);

      const ok = await freshAuth.signIn({ username: "area.manado", password: DEMO_AREA_PASSWORD });
      expect(ok).toMatchObject({ ok: true, user: { username: "area.manado", assignedArea: "Manado", role: "user" } });

      // Even if a built-in demo account drifted to another area in localStorage, sign-in repairs it
      if (ok.ok) {
        freshAuth.updateAreaUser(ok.user.id, { assignedArea: "Kendari" });
        const healed = await freshAuth.signIn({ username: "area.manado", password: DEMO_AREA_PASSWORD });
        expect(healed).toMatchObject({ ok: true, user: { username: "area.manado", assignedArea: "Manado" } });
      }
      await freshAuth.signOut();
    } finally {
      sessionStorage.clear();
      localStorage.clear();
    }
  });
});
