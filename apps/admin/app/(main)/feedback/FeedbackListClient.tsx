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
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
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
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
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

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
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
                  <tr ref={sentinelRef}>
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

