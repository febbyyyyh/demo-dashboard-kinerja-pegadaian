import type { CSSProperties, ReactNode } from "react";
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
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

/** Drag-and-drop list ordering for the Form Builder (pages, questions) and Daily Report metrics. */
export function SortableList({
  ids,
  onMove,
  direction = "vertical",
  children,
}: {
  ids: string[];
  onMove: (from: number, to: number) => void;
  direction?: "vertical" | "horizontal";
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = ids.indexOf(String(event.active.id));
    const to = ids.indexOf(String(event.over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={ids}
        strategy={direction === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** One sortable row; `children` receives a ready-made drag handle element. */
export function SortableItem({
  id,
  className,
  as: Tag = "div",
  children,
}: {
  id: string;
  className?: string;
  as?: "div" | "li" | "section";
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground active:cursor-grabbing"
      aria-label="Geser untuk mengurutkan"
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <Tag ref={setNodeRef} style={style} className={cn(className, isDragging && "relative z-20 opacity-90 shadow-lift")}>
      {children(handle)}
    </Tag>
  );
}
