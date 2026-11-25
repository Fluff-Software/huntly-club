"use client";

import { useEffect, useState } from "react";
import { searchPushUsers, type PushUserSearchItem } from "./actions";
import { INACTIVE_DAY_OPTIONS } from "./push-limits";

export type AudienceType = "all" | "inactive" | "users";

function formatLastActive(iso: string | null): string {
  if (!iso) return "never active";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "active today";
  if (days === 1) return "active yesterday";
  return `active ${days} days ago`;
}

function RadioRow({
  checked,
  onSelect,
  label,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        checked ? "border-huntly-sage bg-huntly-sage/10" : "border-stone-200 bg-white"
      }`}
    >
      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-stone-800">
        <input type="radio" checked={checked} onChange={onSelect} className="accent-huntly-forest" />
        {label}
      </label>
      {checked && children ? <div className="mt-3 pl-7">{children}</div> : null}
    </div>
  );
}

export function PushAudiencePicker({
  type,
  onTypeChange,
  inactiveDays,
  onInactiveDaysChange,
  selectedUsers,
  onSelectedUsersChange,
  disabled,
}: {
  type: AudienceType;
  onTypeChange: (t: AudienceType) => void;
  inactiveDays: number;
  onInactiveDaysChange: (days: number) => void;
  selectedUsers: PushUserSearchItem[];
  onSelectedUsersChange: (users: PushUserSearchItem[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PushUserSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "users") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setSearching(true);
      searchPushUsers(q)
        .then((res) => {
          if (cancelled) return;
          setSearchError(res.error ?? null);
          setResults(res.users ?? []);
        })
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [type, query]);

  const selectedIds = new Set(selectedUsers.map((u) => u.user_id));

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 block text-sm font-medium text-stone-700">Send to</legend>

      <RadioRow checked={type === "all"} onSelect={() => onTypeChange("all")} label="Everyone with notifications on" />

      <RadioRow
        checked={type === "inactive"}
        onSelect={() => onTypeChange("inactive")}
        label="People who haven’t used the app for a while"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
          <span>Not active in the app for at least</span>
          <select
            value={inactiveDays}
            onChange={(e) => onInactiveDaysChange(Number(e.target.value))}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
          >
            {INACTIVE_DAY_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-xs text-stone-500">
          Only includes phones we can link to an account. Phones registered before this update may be
          left out until the app is opened again.
        </div>
      </RadioRow>

      <RadioRow checked={type === "users"} onSelect={() => onTypeChange("users")} label="Specific people">
        {selectedUsers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <span
                key={u.user_id}
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-800"
              >
                {u.email ?? u.user_id}
                {u.push_devices === 0 && <span className="text-amber-700">(no notifications)</span>}
                <button
                  type="button"
                  aria-label={`Remove ${u.email ?? u.user_id}`}
                  className="text-stone-500 hover:text-stone-900"
                  onClick={() => onSelectedUsersChange(selectedUsers.filter((s) => s.user_id !== u.user_id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email…"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
        />
        {searchError && <div className="mt-2 text-xs text-red-600">{searchError}</div>}
        {searching && <div className="mt-2 text-xs text-stone-400">Searching…</div>}
        {results.length > 0 && (
          <ul className="mt-2 max-h-56 divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200 bg-white">
            {results.map((u) => {
              const picked = selectedIds.has(u.user_id);
              return (
                <li key={u.user_id}>
                  <button
                    type="button"
                    disabled={picked}
                    onClick={() => {
                      onSelectedUsersChange([...selectedUsers, u]);
                      setQuery("");
                      setResults([]);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-stone-50 disabled:opacity-50"
                  >
                    <span className="truncate text-stone-900">{u.email ?? u.user_id}</span>
                    <span className="shrink-0 text-xs text-stone-500">
                      {u.push_devices > 0
                        ? `${u.push_devices} phone${u.push_devices === 1 ? "" : "s"}`
                        : "no notifications"}{" "}
                      · {formatLastActive(u.last_active_at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && !searchError && (
          <div className="mt-2 text-xs text-stone-500">No users match that email.</div>
        )}
      </RadioRow>
    </fieldset>
  );
}
