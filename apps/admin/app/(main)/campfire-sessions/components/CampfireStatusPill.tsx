import type { CampfireSessionStatus } from "../types";

const STATUS_STYLES: Record<
  CampfireSessionStatus,
  { label: string; classes: string }
> = {
  draft: {
    label: "Draft",
    classes: "bg-stone-100 text-stone-700 border-stone-200",
  },
  scheduled: {
    label: "Scheduled",
    classes: "bg-blue-50 text-blue-800 border-blue-200",
  },
  live: {
    label: "Live",
    classes: "bg-red-50 text-red-800 border-red-200",
  },
  replay: {
    label: "Replay",
    classes: "bg-purple-50 text-purple-800 border-purple-200",
  },
  archived: {
    label: "Archived",
    classes: "bg-stone-50 text-stone-500 border-stone-200",
  },
};

export function CampfireStatusPill({ status }: { status: CampfireSessionStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.classes}`}
    >
      {style.label}
    </span>
  );
}
