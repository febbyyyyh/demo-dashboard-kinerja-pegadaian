import { Link } from "@tanstack/react-router";
import { Database, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/fk/States";
import { Button } from "@/components/ui/button";
import { repository } from "@/lib/formkanwil/repository";

export function ReportEmptyState() {
  return (
    <EmptyState
      emoji="🗂️"
      title="Daily Report belum dikonfigurasi"
      description="Tandai form Feeding 1/2 dan tambahkan metrik di halaman konfigurasi — atau muat data contoh untuk melihat tampilannya."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/admin/daily-report/config">
              <SlidersHorizontal /> Buka konfigurasi
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              repository.dailyReport.loadDemo();
              toast.success("Data contoh dimuat", {
                description: "2 form feeding, 12 UPC, dan 14 hari laporan.",
              });
            }}
          >
            <Database /> Muat data contoh
          </Button>
        </div>
      }
    />
  );
}
