import { useState, type ChangeEvent } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildImportedChoices,
  detectUpcColumns,
  parseUpcImportFile,
  type ImportedChoices,
  type ImportedTable,
} from "@/lib/formkanwil/upc-import";

interface UpcListImportDialogProps {
  onImport: (choices: ImportedChoices) => void;
}

const NO_CODE_COLUMN = "none";

export function UpcListImportDialog({ onImport }: UpcListImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState<ImportedTable | null>(null);
  const [codeIndex, setCodeIndex] = useState<string>(NO_CODE_COLUMN);
  const [nameIndex, setNameIndex] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setLoading(true);
    setError(null);
    setTable(null);
    try {
      const importedTable = await parseUpcImportFile(file);
      const detected = detectUpcColumns(importedTable.columns);
      setTable(importedTable);
      setCodeIndex(detected.codeIndex === null ? NO_CODE_COLUMN : String(detected.codeIndex));
      setNameIndex(String(detected.nameIndex ?? 0));
    } catch (reason) {
      console.error("Gagal membaca daftar UPC:", reason);
      setError(reason instanceof Error ? reason.message : "File tidak dapat dibaca.");
    } finally {
      setLoading(false);
    }
  }

  function applyImport() {
    if (!table) return;
    try {
      const choices = buildImportedChoices(
        table,
        codeIndex === NO_CODE_COLUMN ? null : Number(codeIndex),
        Number(nameIndex),
      );
      if (choices.options.length < 2) {
        setError("Daftar harus memiliki setidaknya dua pilihan.");
        return;
      }
      onImport(choices);
      toast.success(`${choices.options.length} pilihan UPC dimuat`, {
        description: "Simpan form untuk menerapkan perubahan.",
      });
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pilihan dari file tidak valid.");
    }
  }

  function previewLabel(row: Record<string, string>) {
    const indexes = [...new Set([codeIndex, nameIndex])]
      .filter((index) => index !== NO_CODE_COLUMN)
      .map(Number);
    return indexes
      .map((index) => row[table?.columns[index] ?? ""] ?? "")
      .filter(Boolean)
      .join(" - ");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileUp /> Impor daftar UPC
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impor daftar UPC / unit kerja</DialogTitle>
          <DialogDescription>
            Unggah Excel (.xlsx) atau PDF berbasis teks. Kolom lain ikut disimpan sebagai metadata
            dan tersedia pada ekspor jawaban.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.pdf"
            aria-label="Pilih file daftar UPC"
            onChange={handleFileChange}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            PDF hasil scan/foto tidak didukung. Maksimal ukuran file 15 MB.
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" /> Membaca file…
            </div>
          )}

          {table && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  Kolom kode (opsional)
                  <Select value={codeIndex} onValueChange={setCodeIndex}>
                    <SelectTrigger aria-label="Kolom kode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CODE_COLUMN}>Tanpa kode</SelectItem>
                      {table.columns.map((column, index) => (
                        <SelectItem key={`${column}-${index}`} value={String(index)}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Kolom nama / label
                  <Select value={nameIndex} onValueChange={setNameIndex}>
                    <SelectTrigger aria-label="Kolom nama atau label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {table.columns.map((column, index) => (
                        <SelectItem key={`${column}-${index}`} value={String(index)}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="rounded-xl border">
                <div className="border-b bg-muted/50 px-3 py-2 text-sm font-semibold">
                  Pratinjau {table.rows.length} baris · {table.columns.length} kolom
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2 font-semibold">Pilihan</th>
                        {table.columns.map((column, index) => (
                          <th
                            key={`${column}-${index}`}
                            className="whitespace-nowrap px-3 py-2 font-semibold"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 8).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t">
                          <td className="whitespace-nowrap px-3 py-2 font-medium">
                            {previewLabel(row)}
                          </td>
                          {table.columns.map((column) => (
                            <td key={column} className="whitespace-nowrap px-3 py-2">
                              {row[column]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {error && (
            <p
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={applyImport} disabled={!table || loading}>
            Gunakan daftar ini
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
