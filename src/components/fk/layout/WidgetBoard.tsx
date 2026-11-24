import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Columns3,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdminOnly } from "@/components/fk/access/AdminAccess";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { moveWidget, SPAN_CLASS, WIDGET_SPANS } from "@/lib/formkanwil/layout";
import { repository } from "@/lib/formkanwil/repository";
import type { LayoutKey, LayoutWidget, WidgetSpan } from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";

/* ---------------- Editor state ---------------- */

export interface LayoutEditor {
  key: LayoutKey;
  editing: boolean;
  widgets: LayoutWidget[];
  start(): void;
  cancel(): void;
  save(): void;
  resetDefault(): void;
  update(id: string, patch: Partial<LayoutWidget>): void;
  move(activeId: string, overId: string): void;
  labelFor(widget: LayoutWidget): string;
}

export function useLayoutEditor(
  key: LayoutKey,
  saved: LayoutWidget[],
  defaults: LayoutWidget[],
  fallbackLabel: (widget: LayoutWidget) => string = () => "Widget",
): LayoutEditor {
  const [draft, setDraft] = useState<LayoutWidget[] | null>(null);
  const editing = draft !== null;
  return {
    key,
    editing,
    widgets: draft ?? saved,
    start: () => setDraft(saved),
    cancel: () => setDraft(null),
    save: () => {
      if (!draft) return;
      repository.layout.save(key, draft);
      setDraft(null);
      toast.success("Tata letak disimpan", { description: "Pengunjung kini melihat susunan ini." });
    },
    resetDefault: () => {
      setDraft(defaults);
      toast.info("Tata letak default dipulihkan", { description: "Klik Simpan Tata Letak untuk menerapkan." });
    },
    update: (id, patch) =>
      setDraft((current) => (current ?? saved).map((item) => (item.id === id ? { ...item, ...patch } : item))),
    move: (activeId, overId) => setDraft((current) => moveWidget(current ?? saved, activeId, overId)),
    labelFor: (widget) => widget.title || fallbackLabel(widget),
  };
}

/* ---------------- Inline title / subtitle ---------------- */

interface WidgetContextValue {
  widget: LayoutWidget;
  editing: boolean;
  update: (patch: Partial<LayoutWidget>) => void;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

export function useWidget() {
  return useContext(WidgetContext);
}

function InlineText({
  field,
  fallback,
  className,
  as: Tag,
}: {
  field: "title" | "subtitle";
  fallback: string;
  className?: string;
  as: "h2" | "h3" | "p" | "span";
}) {
  const ctx = useWidget();
  const value = ctx?.widget[field] ?? "";
  if (!ctx?.editing) {
    const text = value || fallback;
    return text ? <Tag className={className}>{text}</Tag> : null;
  }
  return (
    <input
      value={value}
      placeholder={fallback || (field === "title" ? "Judul widget" : "Tambah subjudul…")}
      onChange={(event) => ctx.update({ [field]: event.target.value })}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={field === "title" ? "Edit judul widget" : "Edit subjudul widget"}
      className={cn(
        "block w-full min-w-0 rounded-md border-b border-dashed border-current/40 bg-transparent px-0.5 outline-none placeholder:text-current/50 focus:border-solid focus:bg-mint-soft/40",
        className,
      )}
    />
  );
}

export function WidgetTitle(props: { fallback?: string; className?: string; as?: "h2" | "h3" | "span" }) {
  return <InlineText field="title" fallback={props.fallback ?? ""} as={props.as ?? "h2"} {...(props.className ? { className: props.className } : {})} />;
}

export function WidgetSubtitle(props: { fallback?: string; className?: string }) {
  return <InlineText field="subtitle" fallback={props.fallback ?? ""} as="p" {...(props.className ? { className: props.className } : {})} />;
}

/* ---------------- Board ---------------- */

function SortableWidget({
  widget,
  editor,
  children,
}: {
  widget: LayoutWidget;
  editor: LayoutEditor;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !editor.editing,
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const update = (patch: Partial<LayoutWidget>) => editor.update(widget.id, patch);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative min-w-0",
        SPAN_CLASS[widget.colSpan],
        editor.editing && "rounded-2xl outline-2 outline-offset-4 outline-dashed outline-primary/35",
        isDragging && "z-30 opacity-80 shadow-lift",
      )}
      data-widget={widget.id}
    >
      {editor.editing && (
        <div className="absolute -top-3 right-3 z-20 flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5 shadow-lift">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="grid size-7 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground active:cursor-grabbing"
            aria-label={`Geser ${editor.labelFor(widget)}`}
          >
            <GripVertical className="size-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground"
                aria-label="Ubah lebar widget"
              >
                <Columns3 className="size-3.5" /> {widget.colSpan === "full" ? "Penuh" : widget.colSpan}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuLabel>Lebar widget</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={widget.colSpan}
                onValueChange={(value) => value && update({ colSpan: value as WidgetSpan })}
              >
                {WIDGET_SPANS.map((span) => (
                  <DropdownMenuRadioItem key={span.value} value={span.value}>
                    {span.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => update({ visible: false })}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive-soft hover:text-destructive-foreground"
            aria-label={`Sembunyikan ${editor.labelFor(widget)}`}
            title="Sembunyikan widget"
          >
            <EyeOff className="size-3.5" />
          </button>
        </div>
      )}
      <WidgetContext.Provider value={{ widget, editing: editor.editing, update }}>
        <div
          className="h-full"
          onClickCapture={(event) => {
            if (!editor.editing) return;
            const target = event.target as HTMLElement;
            if (target.closest("a") && target.tagName !== "INPUT") event.preventDefault();
          }}
        >
          {children}
        </div>
      </WidgetContext.Provider>
    </div>
  );
}

export function WidgetBoard({
  editor,
  render,
  className,
  empty,
}: {
  editor: LayoutEditor;
  render: (widget: LayoutWidget) => ReactNode;
  className?: string;
  empty?: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const visible = editor.widgets.filter((widget) => widget.visible);

  function onDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) {
      editor.move(String(event.active.id), String(event.over.id));
    }
  }

  if (visible.length === 0 && empty) return <>{empty}</>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visible.map((widget) => widget.id)} strategy={rectSortingStrategy}>
        <div className={cn("grid grid-cols-12 gap-4", editor.editing && "gap-6 pt-2", className)}>
          {visible.map((widget) => (
            <SortableWidget key={widget.id} widget={widget} editor={editor}>
              {render(widget)}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ---------------- Toolbar & entry button ---------------- */

export function LayoutEditButton({ editor, className }: { editor: LayoutEditor; className?: string }) {
  if (editor.editing) return null;
  return (
    <AdminOnly>
      <Button variant="outline" onClick={editor.start} className={className}>
        <LayoutGrid /> Atur Tampilan
      </Button>
    </AdminOnly>
  );
}

export function LayoutToolbar({ editor }: { editor: LayoutEditor }) {
  const [drawer, setDrawer] = useState(false);
  if (!editor.editing) return null;
  const hidden = editor.widgets.filter((widget) => !widget.visible);

  return (
    <>
      <div
        role="toolbar"
        aria-label="Atur Tampilan"
        className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-lift backdrop-blur animate-page-in"
      >
        <span className="hidden items-center gap-2 px-2 text-sm font-semibold md:inline-flex">
          <LayoutGrid className="size-4 text-primary" /> Atur Tampilan
        </span>
        <Button variant="outline" size="sm" onClick={() => setDrawer(true)}>
          <Plus /> Tambah Widget
          {hidden.length > 0 && <span className="pill bg-mint-soft text-mint-foreground">{hidden.length}</span>}
        </Button>
        <Button variant="ghost" size="sm" onClick={editor.resetDefault}>
          <RotateCcw /> Reset Default
        </Button>
        <Button variant="ghost" size="sm" onClick={editor.cancel}>
          <X /> Batalkan
        </Button>
        <Button size="sm" onClick={editor.save}>
          <Save /> Simpan Tata Letak
        </Button>
      </div>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Tambah Widget</SheetTitle>
            <SheetDescription>Widget yang disembunyikan tidak terlihat oleh pengunjung.</SheetDescription>
          </SheetHeader>
          <div className="mt-2 space-y-2 px-4 pb-6">
            {hidden.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-mint px-4 py-8 text-center text-sm text-muted-foreground">
                Semua widget sudah tampil.
              </p>
            ) : (
              hidden.map((widget) => (
                <div key={widget.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{editor.labelFor(widget)}</span>
                  <Button size="sm" variant="secondary" onClick={() => editor.update(widget.id, { visible: true })}>
                    <Eye /> Tampilkan
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
