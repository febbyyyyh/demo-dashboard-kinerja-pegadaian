import { useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarRange, FileDown, FileImage, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useDailyReport } from "@/components/fk/report/DailyReportContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all";

const PRESETS = [
  { label: "Hari ini", days: 0 },
  { label: "7 hari", days: 6 },
  { label: "14 hari", days: 13 },
  { label: "30 hari", days: 29 },
];

interface ReportToolbarProps {
  showBranch?: boolean;
  onExportJpeg: () => Promise<void>;
  onExportCsv: () => void;
  onExportPdf: () => Promise<void>;
  children?: React.ReactNode;
}

export function ReportToolbar({
  showBranch = true,
  onExportJpeg,
  onExportCsv,
  onExportPdf,
  children,
}: ReportToolbarProps) {
  const { filter, setFilter, areas, branches, periodLabel } = useDailyReport();
  const [busy, setBusy] = useState<null | "jpeg" | "pdf">(null);

  async function run(kind: "jpeg" | "pdf", task: () => Promise<void>) {
    setBusy(kind);
    try {
      await task();
      toast.success(kind === "jpeg" ? "Gambar JPEG diunduh" : "PDF diunduh");
    } catch (error) {
      console.error(`Ekspor ${kind} gagal`, error);
      toast.error("Ekspor gagal. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel flex flex-wrap items-center gap-2 p-2.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 tabular-nums">
            <CalendarRange /> {periodLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-2xl p-0">
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setFilter({
                    from: format(subDays(today, preset.days), "yyyy-MM-dd"),
                    to: format(today, "yyyy-MM-dd"),
                  });
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            locale={localeId}
            numberOfMonths={1}
            defaultMonth={parseISO(filter.to)}
            selected={{ from: parseISO(filter.from), to: parseISO(filter.to) }}
            onSelect={(range) => {
              if (!range?.from) return;
              setFilter({
                from: format(range.from, "yyyy-MM-dd"),
                to: format(range.to ?? range.from, "yyyy-MM-dd"),
              });
            }}
          />
        </PopoverContent>
      </Popover>

      <Select
        value={filter.area ?? ALL}
        onValueChange={(value) => setFilter({ area: value === ALL ? null : value })}
      >
        <SelectTrigger className="h-9 w-44 rounded-xl">
          <SelectValue placeholder="Semua area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua area</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showBranch && (
        <Select
          value={filter.branch ?? ALL}
          onValueChange={(value) => setFilter({ branch: value === ALL ? null : value })}
        >
          <SelectTrigger className="h-9 w-48 rounded-xl">
            <SelectValue placeholder="Semua cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua cabang</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {children}

      <div className="ml-auto flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="h-9"
          onClick={() => run("jpeg", onExportJpeg)}
          disabled={busy !== null}
        >
          {busy === "jpeg" ? <Loader2 className="animate-spin" /> : <FileImage />} Export .jpeg
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => {
            onExportCsv();
            toast.success("CSV diunduh");
          }}
        >
          <FileSpreadsheet /> CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => run("pdf", onExportPdf)}
          disabled={busy !== null}
        >
          {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileDown />} PDF
        </Button>
      </div>
    </div>
  );
}
