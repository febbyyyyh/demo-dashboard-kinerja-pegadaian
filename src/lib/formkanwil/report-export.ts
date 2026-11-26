import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { csvCell } from "./logic";

export interface ExportTable {
  /** File name without extension. */
  filename: string;
  title: string;
  period: string;
  columns: string[];
  rows: string[][];
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printedAt(date = new Date()) {
  return format(date, "d MMMM yyyy, HH:mm", { locale: localeId });
}

/** CSV with UTF-8 BOM, metadata lines and formula escaping (same rules as answer exports). */
export function tableToCsv(table: Omit<ExportTable, "filename">, now = new Date()): string {
  const lines = [
    [table.title],
    [`Periode: ${table.period}`],
    [`Dicetak: ${printedAt(now)}`],
    [],
    table.columns,
    ...table.rows,
  ];
  return "\uFEFF" + lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function exportTableCsv(table: ExportTable) {
  downloadBlob(new Blob([tableToCsv(table)], { type: "text/csv;charset=utf-8" }), `${table.filename}.csv`);
}

/** Resolves a CSS colour variable (oklch, hex, color-mix…) to RGB for jsPDF. */
export function resolveCssColor(variable: string): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  if (!context) return [20, 108, 67];
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);
  const [r = 20, g = 108, b = 67] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export async function exportTablePdf(table: ExportTable) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const primary = resolveCssColor("--primary");
  doc.setFillColor(...primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");
  doc.setFontSize(15);
  doc.text(table.title, 30, 34);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dashboard Kinerja Regional (Demo Portofolio) · Periode ${table.period} · Dicetak ${printedAt()}`, 30, 50);
  doc.setTextColor(15, 23, 42);
  autoTable(doc, {
    head: [table.columns],
    body: table.rows,
    startY: 62,
    margin: 30,
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: primary },
    didParseCell: (data) => {
      const first = String(data.row.raw && Array.isArray(data.row.raw) ? data.row.raw[0] : "");
      if (data.section === "body" && /^(Subtotal|Grand Total)/.test(first)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 247, 243];
      }
    },
  });
  doc.save(`${table.filename}.pdf`);
}

/** High-resolution JPEG of a rendered report frame (header, table/cards, footer). */
export async function exportNodeJpeg(node: HTMLElement, filename: string) {
  const { toJpeg } = await import("html-to-image");
  node.dataset["exportingJpeg"] = "true";
  try {
    // Wait a frame so hidden toolbars & overflow:visible recalculate exact full dimensions
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const computedBg = getComputedStyle(node).backgroundColor;
    const background =
      computedBg && computedBg !== "rgba(0, 0, 0, 0)" && computedBg !== "transparent"
        ? computedBg
        : getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#ffffff";
    const width = Math.ceil(Math.max(node.scrollWidth, node.offsetWidth));
    const height = Math.ceil(Math.max(node.scrollHeight, node.offsetHeight));

    const dataUrl = await toJpeg(node, {
      pixelRatio: 2,
      quality: 0.96,
      backgroundColor: background,
      cacheBust: true,
      width,
      height,
      style: {
        margin: "0",
        width: `${width}px`,
        height: `${height}px`,
      },
      filter: (element) =>
        !(element instanceof HTMLElement && element.dataset["exportIgnore"] === "true"),
    });
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${filename}.jpeg`;
    anchor.click();
  } finally {
    delete node.dataset["exportingJpeg"];
  }
}
