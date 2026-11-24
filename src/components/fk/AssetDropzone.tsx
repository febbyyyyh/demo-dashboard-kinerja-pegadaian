import { useRef, useState, type DragEvent } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { readImageAsDataUrl } from "@/lib/formkanwil/theme";
import { cn } from "@/lib/utils";

interface AssetDropzoneProps {
  label: string;
  hint: string;
  value: string | null;
  onChange: (value: string | null) => void;
  previewClassName?: string;
  accept?: string;
}

export function AssetDropzone({ label, hint, value, onChange, previewClassName, accept = "image/*" }: AssetDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      onChange(await readImageAsDataUrl(file));
      toast.success(`${label} diperbarui`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gambar gagal diunggah.");
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 /> Hapus
          </Button>
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
          dragging ? "border-primary bg-mint-soft" : "border-border bg-muted/40 hover:border-primary/40 hover:bg-mint-soft/50",
        )}
      >
        {value ? (
          <img src={value} alt={`Pratinjau ${label}`} className={cn("max-h-24 max-w-full object-contain", previewClassName)} />
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-xl bg-card text-primary shadow-card">
              <ImageUp className="size-5" />
            </span>
            <span className="text-sm font-medium">Seret & lepas, atau klik untuk memilih</span>
          </>
        )}
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          void handleFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
