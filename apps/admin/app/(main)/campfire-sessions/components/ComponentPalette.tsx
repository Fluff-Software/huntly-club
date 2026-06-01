"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  PALETTE_ACCENT_BAR,
  PALETTE_CHIP_CLASSES,
  PALETTE_GROUPS,
  PALETTE_HINTS,
} from "../lib/component-styles";
import {
  COMPONENT_TYPE_LABELS,
  PALETTE_ITEMS,
  type CampfireComponentType,
} from "../types";

const labelByType = Object.fromEntries(
  PALETTE_ITEMS.map((item) => [item.type, item.label])
) as Record<CampfireComponentType, string>;

function PaletteItem({ type }: { type: CampfireComponentType }) {
  const label = labelByType[type] ?? COMPONENT_TYPE_LABELS[type];
  const hint = PALETTE_HINTS[type];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { kind: "palette", componentType: type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`group flex w-full cursor-grab items-center gap-2.5 rounded-lg px-3 py-2.5 text-left ring-1 ring-inset transition-[box-shadow,background-color,opacity,transform] active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-huntly-sage/50 focus-visible:ring-offset-0 focus-visible:ring-offset-stone-900 ${PALETTE_CHIP_CLASSES[type]} ${
        isDragging ? "scale-[0.98] opacity-35" : "hover:shadow-sm"
      }`}
      aria-label={`Drag ${label} onto the timeline`}
      {...listeners}
      {...attributes}
    >
      <span
        className={`h-8 w-1 shrink-0 rounded-full ${PALETTE_ACCENT_BAR[type]}`}
        aria-hidden
      />
      <ComponentTypeIcon type={type} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-tight">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-snug opacity-70">
          {hint}
        </span>
      </span>
      <DragHandleIcon className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" />
    </button>
  );
}

export function ComponentPalette({ onAddLayer }: { onAddLayer: () => void }) {
  return (
    <aside
      className="flex w-52 shrink-0 flex-col overflow-hidden border-r border-stone-700 bg-stone-900/40"
      aria-label="Component palette"
    >
      <header className="shrink-0 border-b border-stone-700/80 bg-stone-900/60 px-3 py-3">
        <div className="flex items-start gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-sm ring-1 ring-inset ring-stone-700"
            aria-hidden
          >
            🧩
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-stone-100">Components</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
              Drag onto the timeline
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        {PALETTE_GROUPS.map((group, i) => (
          <section key={group.title} className={i > 0 ? "mt-4" : undefined}>
            <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              {group.title}
            </h3>
            <ul className="space-y-1.5" role="list">
              {group.types.map((type) => (
                <li key={type}>
                  <PaletteItem type={type} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="shrink-0 border-t border-stone-700/80 bg-stone-900/60 p-2.5">
        <button
          type="button"
          onClick={onAddLayer}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-800/80 px-3 py-2 text-xs font-medium text-stone-200 ring-1 ring-inset ring-stone-700/80 transition-colors hover:bg-stone-800 hover:ring-stone-600"
        >
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add layer
        </button>
        <p className="mt-2 px-1 text-center text-[10px] leading-snug text-stone-600">
          Layers stack tracks on the timeline
        </p>
      </footer>
    </aside>
  );
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`size-3.5 text-current ${className ?? ""}`}
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <circle cx="5" cy="4" r="1.25" />
      <circle cx="11" cy="4" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="11" cy="12" r="1.25" />
    </svg>
  );
}

function ComponentTypeIcon({ type }: { type: CampfireComponentType }) {
  const className = "size-4 shrink-0 opacity-90";
  switch (type) {
    case "audio":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25h-1.5a1.5 1.5 0 0 0-1.5 1.5v4.5a1.5 1.5 0 0 0 1.5 1.5h1.5m0-9 3 3m0 0 3-3m-3 3v7.5" />
        </svg>
      );
    case "video":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      );
    case "captain":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      );
    case "subtitle":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      );
    case "mission_card":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
        </svg>
      );
    case "submission":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      );
  }
}
