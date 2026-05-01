"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFeedbackPage,
  setFeedbackHandled,
  type FeedbackListItem,
} from "./actions";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  initialItems: FeedbackListItem[];
  initialHasMore: boolean;
};

export function FeedbackListClient({
  initialItems,
  initialHasMore,
}: Props) {
  const [items, setItems] = useState<FeedbackListItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const tableSentinelRef = useRef<HTMLTableRowElement | null>(null);
  const cardSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!initialLoadDone.current && searchQuery === "") {
      initialLoadDone.current = true;
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    getFeedbackPage(0, PAGE_SIZE, searchQuery || undefined)
      .then(({ items: nextItems, hasMore: nextHasMore }) => {
        if (!cancelled) {
          setItems(nextItems);
          setHasMore(nextHasMore);
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const { items: nextItems, hasMore: nextHasMore } = await getFeedbackPage(
        items.length,
        PAGE_SIZE,
        searchQuery || undefined
      );
      setItems((prev) => [...prev, ...nextItems]);
      setHasMore(nextHasMore);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, items.length, searchQuery]);

  const sentinelVisible = hasMore && items.length > 0 && !searchLoading;

  useEffect(() => {
    if (!sentinelVisible) return;
    const elements = [tableSentinelRef.current, cardSentinelRef.current].filter(
      (el): el is HTMLTableRowElement | HTMLDivElement => el !== null
    );
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "200px", threshold: 0 }
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, sentinelVisible]);

  const toggleHandled = async (row: FeedbackListItem) => {
    if (updatingId !== null) return;
    const nextHandled = !row.handled;
    setUpdatingId(row.id);
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, handled: nextHandled } : item
      )
    );
    try {
      await setFeedbackHandled(row.id, nextHandled);
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, handled: row.handled } : item
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="mb-4 max-w-xl">
        <label htmlFor="feedback-search" className="sr-only">
          Search feedback
        </label>
        <input
          id="feedback-search"
          type="search"
          placeholder="Search by email, message, or screen…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-forest"
          aria-label="Search feedback by email, message, or screen"
        />
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {searchLoading ? (
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500 shadow-sm">
            Searching…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500 shadow-sm">
            {searchQuery.trim()
              ? "No feedback matches your search."
              : "No feedback has been submitted yet."}
          </div>
        ) : (
          <>
            {items.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-500">When</p>
                    <p className="mt-0.5 text-sm font-medium text-stone-900">
                      {new Date(row.created_at).toLocaleString("en-GB")}
                    </p>
                    {row.screen && (
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {row.screen}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHandled(row)}
                    disabled={updatingId === row.id}
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      row.handled
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {updatingId === row.id ? "Saving…" : row.handled ? "Handled" : "New"}
                  </button>
                </div>

                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="text-xs font-medium text-stone-500">From</p>
                    <p className="mt-0.5 truncate text-sm text-stone-800">
                      {row.user_email ?? row.user_id ?? "–"}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {row.profile_id != null ? `Profile #${row.profile_id}` : "–"}
                      {row.team_id != null ? ` • Team #${row.team_id}` : ""}
                    </p>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Message</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-stone-900 line-clamp-6">
                      {row.message?.trim() ? row.message : "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                      <p className="text-xs font-medium text-stone-500">Device</p>
                      <p className="mt-0.5 text-sm text-stone-900">
                        {row.device_platform ?? "–"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {row.device_model ?? ""}
                      </p>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                      <p className="text-xs font-medium text-stone-500">App</p>
                      <p className="mt-0.5 text-sm text-stone-900">
                        {row.app_version ?? "–"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {row.app_build ?? ""}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {hasMore && (
              <div
                ref={cardSentinelRef}
                className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-5 text-center text-sm text-stone-500 shadow-sm"
              >
                {loading ? "Loading more…" : "Scroll to load more"}
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm sm:block">
        <table className="min-w-full divide-y divide-stone-200">
          <thead>
            <tr>
              <th className={thClass}>When</th>
              <th className={thClass}>Profile / Team</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Message</th>
              <th className={thClass}>Device</th>
              <th className={thClass}>App</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {searchLoading ? (
              <tr>
                <td colSpan={7} className={tdClass + " text-center text-stone-500"}>
                  Searching…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className={tdClass + " text-center text-stone-500"}>
                  {searchQuery.trim()
                    ? "No feedback matches your search."
                    : "No feedback has been submitted yet."}
                </td>
              </tr>
            ) : (
              <>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {new Date(row.created_at).toLocaleString("en-GB")}
                      </span>
                      {row.screen && (
                        <span className="mt-0.5 block text-xs text-stone-500">
                          {row.screen}
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {row.profile_id != null ? `Profile #${row.profile_id}` : "–"}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.team_id != null ? `Team #${row.team_id}` : ""}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="block max-w-[220px] truncate text-sm text-stone-700">
                        {row.user_email ?? row.user_id ?? "–"}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {row.message?.slice(0, 120) ?? ""}
                        {row.message && row.message.length > 120 ? "…" : ""}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {row.device_platform ?? "–"}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.device_model ?? ""}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {row.app_version ?? "–"}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.app_build ?? ""}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <button
                        type="button"
                        onClick={() => toggleHandled(row)}
                        disabled={updatingId === row.id}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          row.handled
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {updatingId === row.id
                          ? "Saving…"
                          : row.handled
                            ? "Handled"
                            : "New"}
                      </button>
                    </td>
                  </tr>
                ))}
                {hasMore && (
                  <tr ref={tableSentinelRef}>
                    <td colSpan={7} className={tdClass + " text-center"}>
                      <span className="text-sm text-stone-500">
                        {loading ? "Loading more…" : "Scroll to load more"}
                      </span>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

const thClass =
  "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500";
const tdClass =
  "whitespace-nowrap px-6 py-4 align-top text-sm text-stone-700 align-top";

