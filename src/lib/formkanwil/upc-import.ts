export interface ImportedTable {
  columns: string[];
  rows: Array<Record<string, string>>;
}

export interface ImportedChoices {
  options: string[];
  optionMetadata: Array<Record<string, string>>;
  optionMetadataColumns: string[];
}

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_IMPORT_SIZE = 1_000_000;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 60;
const MAX_PDF_PAGES = 80;

export async function parseUpcImportFile(file: File): Promise<ImportedTable> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file maksimal 15 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  let rawRows: string[][];

  if (extension === "pdf") {
    rawRows = await extractPdfRows(file);
  } else if (extension === "xlsx") {
    rawRows = await extractSpreadsheetRows(file);
  } else {
    throw new Error("Format file harus Excel (.xlsx) atau PDF berbasis teks.");
  }

  return normalizeImportedTable(rawRows);
}

export function normalizeImportedTable(rawRows: string[][]): ImportedTable {
  const rows = rawRows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));
  const headerIndex = rows.findIndex((row) => row.filter(Boolean).length >= 2);

  if (headerIndex < 0 || rows.length <= headerIndex + 1) {
    throw new Error("File harus berisi satu baris judul kolom dan setidaknya satu baris data.");
  }

  const headerRow = rows[headerIndex] ?? [];
  const columnCount = Math.max(
    headerRow.length,
    ...rows.slice(headerIndex + 1).map((row) => row.length),
  );
  if (columnCount > MAX_COLUMNS) {
    throw new Error(`File berisi terlalu banyak kolom (maksimal ${MAX_COLUMNS}).`);
  }

  const columns = createUniqueHeaders(headerRow, columnCount);
  const normalizedRows = rows.slice(headerIndex + 1).flatMap((row) => {
    if (row.every((value, index) => value === columns[index])) return [];
    const record = Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""]));
    return Object.values(record).some(Boolean) ? [record] : [];
  });

  if (normalizedRows.length === 0) {
    throw new Error("Tidak ada baris data setelah judul kolom.");
  }
  if (normalizedRows.length > MAX_ROWS) {
    throw new Error(`File berisi terlalu banyak baris (maksimal ${MAX_ROWS}).`);
  }

  const table = { columns, rows: normalizedRows };
  if (JSON.stringify(table).length > MAX_IMPORT_SIZE) {
    throw new Error("Data hasil impor terlalu besar untuk disimpan di browser ini.");
  }
  return table;
}

export function detectUpcColumns(columns: string[]): {
  codeIndex: number | null;
  nameIndex: number | null;
} {
  const codeIndex = columns.findIndex((column) => /\b(kode|code|id|nomor|no\.?)\b/i.test(column));
  let nameIndex = columns.findIndex((column) =>
    /\b(nama|name|upc|unit|outlet|cabang|branch)\b/i.test(column),
  );
  if (nameIndex === codeIndex) nameIndex = -1;

  return {
    codeIndex: codeIndex >= 0 ? codeIndex : columns.length > 1 ? 0 : null,
    nameIndex: nameIndex >= 0 ? nameIndex : columns.length > 1 ? 1 : 0,
  };
}

export function buildImportedChoices(
  table: ImportedTable,
  codeIndex: number | null,
  nameIndex: number | null,
): ImportedChoices {
  const labelIndexes = [
    ...new Set([codeIndex, nameIndex].filter((index): index is number => index !== null)),
  ];
  if (labelIndexes.length === 0) {
    throw new Error("Pilih setidaknya satu kolom untuk label pilihan.");
  }

  const options: string[] = [];
  const optionMetadata: Array<Record<string, string>> = [];
  const labels = new Set<string>();

  for (const row of table.rows) {
    const label = labelIndexes
      .map((index) => {
        const column = table.columns[index];
        return column ? row[column] : "";
      })
      .filter(Boolean)
      .join(" - ");
    if (!label) continue;
    if (labels.has(label)) {
      throw new Error(`Label pilihan "${label}" muncul lebih dari sekali. Pilih kolom pembeda.`);
    }
    labels.add(label);
    options.push(label);
    optionMetadata.push({ ...row });
  }

  if (options.length === 0) {
    throw new Error("Tidak ada pilihan dengan nilai pada kolom yang dipilih.");
  }

  return { options, optionMetadata, optionMetadataColumns: [...table.columns] };
}

async function extractSpreadsheetRows(file: File): Promise<string[][]> {
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = await readXlsxFile(file);
  const firstSheet = sheets[0];
  if (!firstSheet) throw new Error("File Excel tidak memiliki sheet yang bisa dibaca.");
  return firstSheet.data.map((row) => Array.from(row, (cell) => String(cell ?? "")));
}

async function extractPdfRows(file: File): Promise<string[][]> {
  const [{ getDocument, GlobalWorkerOptions }, workerUrl] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl.default;

  const document = await getDocument({ data: await file.arrayBuffer() }).promise;
  if (document.numPages > MAX_PDF_PAGES) {
    await document.destroy();
    throw new Error(`PDF berisi terlalu banyak halaman (maksimal ${MAX_PDF_PAGES}).`);
  }

  const rows: string[][] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: Array<{ y: number; items: Array<{ x: number; right: number; text: string }> }> =
        [];

      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const x = item.transform[4] ?? 0;
        const y = item.transform[5] ?? 0;
        let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 3);
        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }
        line.items.push({ x, right: x + item.width, text: item.str.trim() });
      }

      for (const line of lines.sort((a, b) => b.y - a.y)) {
        const cells: string[] = [];
        let lastRight = Number.NEGATIVE_INFINITY;
        for (const item of line.items.sort((a, b) => a.x - b.x)) {
          if (item.x - lastRight > 18 || cells.length === 0) {
            cells.push(item.text);
          } else {
            const lastIndex = cells.length - 1;
            cells[lastIndex] = `${cells[lastIndex]} ${item.text}`;
          }
          lastRight = item.right;
        }
        if (cells.length > 0) rows.push(cells);
      }
    }
  } finally {
    await document.destroy();
  }

  return rows;
}

function createUniqueHeaders(headerRow: string[], columnCount: number): string[] {
  const used = new Set<string>();
  return Array.from({ length: columnCount }, (_, index) => {
    const base = headerRow[index] || `Kolom ${index + 1}`;
    let header = base;
    let suffix = 2;
    while (used.has(header)) {
      header = `${base} (${suffix})`;
      suffix += 1;
    }
    used.add(header);
    return header;
  });
}
