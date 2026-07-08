import type { CampfireSessionStatus } from "../types";

export const CAMPFIRE_STATUS_CONFIG: Record<
  CampfireSessionStatus,
  { label: string; light: string; dark: string; dot: string }
> = {
  draft: {
    label: "Draft",
    light: "bg-stone-100 text-stone-700 border-stone-200",
    dark: "bg-stone-800/80 text-stone-300 border-stone-600",
    dot: "bg-stone-400",
  },
  scheduled: {
    label: "Scheduled",
    light: "bg-blue-50 text-blue-800 border-blue-200",
    dark: "bg-blue-950/50 text-blue-200 border-blue-800/60",
    dot: "bg-blue-400",
  },
  live: {
    label: "Live",
    light: "bg-red-50 text-red-800 border-red-200",
    dark: "bg-red-950/50 text-red-200 border-red-800/60",
    dot: "bg-red-400",
  },
  replay: {
    label: "Replay",
    light: "bg-purple-50 text-purple-800 border-purple-200",
    dark: "bg-purple-950/50 text-purple-200 border-purple-800/60",
    dot: "bg-purple-400",
  },
  archived: {
    label: "Archived",
    light: "bg-stone-50 text-stone-500 border-stone-200",
    dark: "bg-stone-900/80 text-stone-500 border-stone-700",
    dot: "bg-stone-500",
  },
};

export function CampfireStatusPill({
  status,
  variant = "light",
  showDot = false,
}: {
  status: CampfireSessionStatus;
  variant?: "light" | "dark";
  showDot?: boolean;
}) {
  const config =
    CAMPFIRE_STATUS_CONFIG[status] ?? CAMPFIRE_STATUS_CONFIG.draft;
  const classes = variant === "dark" ? config.dark : config.light;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {showDot && (
        <span
          className={`size-1.5 shrink-0 rounded-full ${config.dot} ${status === "live" ? "animate-pulse" : ""}`}
          aria-hidden
        />
      )}
      {config.label}
    </span>
  );
}
