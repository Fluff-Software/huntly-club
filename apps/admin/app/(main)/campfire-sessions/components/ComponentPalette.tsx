"use client";

import { useDraggable } from "@dnd-kit/core";
import { PALETTE_CHIP_CLASSES } from "../lib/component-styles";
import { PALETTE_ITEMS, type CampfireComponentType } from "../types";

function PaletteItem({
  type,
  label,
}: {
  type: CampfireComponentType;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { kind: "palette", componentType: type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:brightness-110 ${PALETTE_CHIP_CLASSES[type]} ${isDragging ? "opacity-40" : ""}`}
      {...listeners}
      {...attributes}
    >
      {label}
    </button>
  );
}

export function ComponentPalette({ onAddLayer }: { onAddLayer: () => void }) {
  return (
    <div className="flex w-44 shrink-0 flex-col border-r border-stone-700 bg-red-950/30">
      <div className="border-b border-stone-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200/80">
        Components
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {PALETTE_ITEMS.map((item) => (
          <PaletteItem key={item.type} type={item.type} label={item.label} />
        ))}
      </div>
      <div className="border-t border-stone-700 p-2">
        <button
          type="button"
          onClick={onAddLayer}
          className="w-full rounded-lg border border-stone-600 bg-stone-800/80 px-3 py-2 text-xs font-medium text-stone-300 hover:bg-stone-700"
        >
          + Add layer
        </button>
      </div>
    </div>
  );
}
