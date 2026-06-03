"use client";

import { useMemo, useState } from "react";
import {
  CAMPFIRE_STATUSES,
  type ActivityOption,
  type CampfireSessionRow,
  type CampfireSessionStatus,
} from "../types";
import {
  CAMPFIRE_STATUS_CONFIG,
  CampfireStatusPill,
} from "./CampfireStatusPill";
import { SessionMissionsModal } from "./SessionMissionsModal";
import { SessionDateTimePicker } from "./SessionDateTimePicker";

type Props = {
  session: CampfireSessionRow;
  activities: ActivityOption[];
  timelineDurationMs?: number;
  onSessionChange: (updates: Partial<CampfireSessionRow>) => void;
};

export function CampfireDetailsPanel({
  session,
  activities,
  timelineDurationMs,
  onSessionChange,
}: Props) {
  const selectedCount = session.missions.length;
  const [missionsModalOpen, setMissionsModalOpen] = useState(false);

  const selectedActivities = useMemo(() => {
    const byId = new Map(activities.map((a) => [a.id, a]));
    return session.missions.map((id) => byId.get(id) ?? { id, title: `Mission #${id}` });
  }, [activities, session.missions]);

  return (
    <aside
      className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-stone-700 bg-stone-900/40"
      aria-label="Session settings"
    >
      <header className="shrink-0 border-b border-stone-700/80 bg-stone-900/60 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-950/40 text-base ring-1 ring-amber-800/40"
            aria-hidden
          >
            🔥
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-stone-100">Session</h2>
            <p className="mt-0.5 text-xs leading-snug text-stone-500">
              Title, schedule, and missions shown in the app.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CampfireStatusPill status={session.status} variant="dark" showDot />
          <span className="text-xs text-stone-500">
            {formatScheduledSummary(session.scheduled_at)}
          </span>
        </div>
      </header>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        <PanelSection title="Details">
          <Field label="Title" htmlFor="session-title">
            <input
              id="session-title"
              type="text"
              value={session.title}
              onChange={(e) => onSessionChange({ title: e.target.value })}
              className={inputClass}
              placeholder="Friday campfire"
            />
          </Field>
          <Field
            label="Description"
            htmlFor="session-description"
            hint="Optional. Shown to members before the session starts."
          >
            <textarea
              id="session-description"
              value={session.description ?? ""}
              rows={3}
              onChange={(e) =>
                onSessionChange({
                  description: e.target.value.trim() || null,
                })
              }
              className={`${inputClass} resize-y min-h-[4.5rem]`}
              placeholder="What will explorers see or do?"
            />
          </Field>
        </PanelSection>

        <PanelSection title="Publishing">
          <Field label="Status">
            <StatusPicker
              value={session.status}
              onChange={(status) => onSessionChange({ status })}
            />
          </Field>
          <Field
            label="Scheduled"
            htmlFor="session-scheduled"
            hint="Shown and edited in the club’s timezone. Leave empty for unscheduled sessions."
          >
            <SessionDateTimePicker
              id="session-scheduled"
              value={session.scheduled_at}
              onChange={(iso) => onSessionChange({ scheduled_at: iso })}
              className={inputClass}
            />
          </Field>
        </PanelSection>

        <PanelSection
          title="Missions in scope"
          action={
            selectedCount > 0 ? (
              <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-medium tabular-nums text-stone-400 ring-1 ring-stone-700">
                {selectedCount}
              </span>
            ) : null
          }
        >
          {selectedActivities.length === 0 ? (
            <p className="text-xs text-stone-500">No missions selected yet.</p>
          ) : (
            <ul className="space-y-1.5" aria-label="Selected missions">
              {selectedActivities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg bg-stone-800/80 px-3 py-2 ring-1 ring-inset ring-stone-700/80"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-200">
                    {a.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onSessionChange({
                        missions: session.missions.filter((id) => id !== a.id),
                      })
                    }
                    className="-mr-0.5 shrink-0 rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-700/80 hover:text-stone-200"
                    aria-label={`Remove ${a.title}`}
                  >
                    <svg
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setMissionsModalOpen(true)}
            disabled={activities.length === 0}
            className="w-full rounded-lg border border-stone-600/80 bg-stone-950/40 px-3 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-500 hover:bg-stone-800/50 hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selectedCount > 0 ? "Edit missions…" : "Choose missions…"}
          </button>
        </PanelSection>
      </div>

      <footer className="shrink-0 border-t border-stone-700/80 bg-stone-900/60 px-4 py-2.5">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div>
            <dt className="text-stone-600">Timeline</dt>
            <dd className="font-medium tabular-nums text-stone-400">
              {formatDurationMs(timelineDurationMs ?? session.duration)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-600">Session ID</dt>
            <dd className="font-mono text-stone-400">#{session.id}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-stone-600">Last saved</dt>
            <dd className="text-stone-400">
              {formatUpdatedAt(session.updated_at)}
            </dd>
          </div>
        </dl>
      </footer>

      <SessionMissionsModal
        open={missionsModalOpen}
        activities={activities}
        selectedIds={session.missions}
        onClose={() => setMissionsModalOpen(false)}
        onChange={(missions) => onSessionChange({ missions })}
      />
    </aside>
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: CampfireSessionStatus;
  onChange: (status: CampfireSessionStatus) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1.5"
      role="radiogroup"
      aria-label="Session status"
    >
      {CAMPFIRE_STATUSES.map((status) => {
        const config = CAMPFIRE_STATUS_CONFIG[status];
        const selected = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(status)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-huntly-sage/50 ${
              selected
                ? `${config.dark} ring-1 ring-stone-600`
                : "border-stone-700/80 bg-stone-950/40 text-stone-400 hover:border-stone-600 hover:bg-stone-800/50 hover:text-stone-200"
            }`}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${config.dot} ${status === "live" && selected ? "animate-pulse" : ""}`}
              aria-hidden
            />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

function PanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-stone-800/80 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {title}
        </h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-600/80 bg-stone-950/60 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/25";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-medium text-stone-400"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-stone-600">{hint}</p>}
    </div>
  );
}

function formatScheduledSummary(iso: string | null): string {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "—";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
