"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityOption } from "../types";

export const PICKER_SEARCH_INPUT_CLASS =
  "w-full rounded-lg border border-stone-600/80 bg-stone-950/60 py-2 px-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/25";

export type MissionPickerRow = {
  activity: ActivityOption;
  subtitle?: string;
};

export function MissionThumb({
  image,
  title,
}: {
  image: string | null;
  title: string;
}) {
  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-stone-800 ring-1 ring-inset ring-stone-700">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center text-[10px] font-medium text-stone-500"
          aria-hidden
        >
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function PickerModal({
  title,
  description,
  children,
  onBackdropClick,
  zClass = "z-[60]",
  wide,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onBackdropClick: () => void;
  zClass?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/60 p-4`}
      aria-modal="true"
      role="dialog"
      onClick={onBackdropClick}
    >
      <div
        className={`flex max-h-[min(88vh,640px)] w-full flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-900 shadow-xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-stone-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-100">{title}</h2>
          <p className="mt-1 text-xs leading-snug text-stone-500">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PickerModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 justify-end border-t border-stone-700 px-4 py-3">
      {children}
    </div>
  );
}

export function CampfireMissionPickerModal({
  open,
  title,
  description,
  rows,
  emptyMessage,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  rows: MissionPickerRow[];
  emptyMessage: string;
  onSelect: (activity: ActivityOption) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    setFilter("");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ activity }) =>
        activity.title.toLowerCase().includes(q) ||
        activity.name.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  if (!open) return null;

  return (
    <PickerModal
      title={title}
      description={description}
      onBackdropClick={onClose}
    >
      {rows.length > 6 && (
        <div className="shrink-0 border-b border-stone-800 px-4 py-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search missions…"
            autoFocus
            className={PICKER_SEARCH_INPUT_CLASS}
            aria-label="Search missions"
          />
        </div>
      )}
      <ul className="min-h-0 flex-1 overflow-y-auto p-2" role="list">
        {filtered.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-stone-500">
            {rows.length === 0 ? emptyMessage : "No missions match your search."}
          </li>
        ) : (
          filtered.map(({ activity, subtitle }) => (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => onSelect(activity)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-stone-800/70"
              >
                <MissionThumb image={activity.image} title={activity.title} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-stone-100">
                    {activity.title}
                  </span>
                  {subtitle && (
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {subtitle}
                    </span>
                  )}
                </span>
                <ChevronIcon />
              </button>
            </li>
          ))
        )}
      </ul>
      <PickerModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-stone-400 hover:text-stone-200"
        >
          Cancel
        </button>
      </PickerModalFooter>
    </PickerModal>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="size-4 shrink-0 text-stone-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
