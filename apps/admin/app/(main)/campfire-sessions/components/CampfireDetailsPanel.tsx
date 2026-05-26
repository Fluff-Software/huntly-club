"use client";

import {
  CAMPFIRE_STATUSES,
  type ActivityOption,
  type CampfireSessionRow,
  type CampfireSessionStatus,
} from "../types";

type Props = {
  session: CampfireSessionRow;
  activities: ActivityOption[];
  onSessionChange: (updates: Partial<CampfireSessionRow>) => void;
};

export function CampfireDetailsPanel({
  session,
  activities,
  onSessionChange,
}: Props) {
  const scheduledLocal = session.scheduled_at
    ? new Date(session.scheduled_at).toISOString().slice(0, 16)
    : "";

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-stone-700 bg-blue-950/20">
      <div className="border-b border-stone-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-200/80">
        Session
      </div>
      <div className="space-y-4 p-3">
        <Field label="Title">
          <input
            type="text"
            value={session.title}
            onChange={(e) => {
              const v = e.target.value;
              onSessionChange({ title: v });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select
            value={session.status}
            onChange={(e) =>
              onSessionChange({
                status: e.target.value as CampfireSessionStatus,
              })
            }
            className={inputClass}
          >
            {CAMPFIRE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scheduled">
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => {
              const v = e.target.value;
              onSessionChange({
                scheduled_at: v ? new Date(v).toISOString() : null,
              });
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Missions in scope">
          <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-600 bg-stone-900/50 p-2">
            {activities.map((a) => {
              const checked = session.missions.includes(a.id);
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-2 py-1 text-xs text-stone-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? session.missions.filter((id) => id !== a.id)
                        : [...session.missions, a.id];
                      onSessionChange({ missions: next });
                    }}
                  />
                  <span className="truncate">{a.title}</span>
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="Description">
          <textarea
            value={session.description ?? ""}
            rows={3}
            onChange={(e) =>
              onSessionChange({
                description: e.target.value.trim() || null,
              })
            }
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-600 bg-stone-900/80 px-3 py-2 text-sm text-stone-100 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-400">
        {label}
      </label>
      {children}
    </div>
  );
}
