"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMissionCompletionsPage,
  type MissionCompletionItem,
} from "./actions";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  initialItems: MissionCompletionItem[];
  initialHasMore: boolean;
};

export function MissionCompletionsListClient({
  initialItems,
  initialHasMore,
}: Props) {
  const [items, setItems] = useState<MissionCompletionItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    getMissionCompletionsPage(0, PAGE_SIZE, searchQuery || undefined)
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
      const { items: nextItems, hasMore: nextHasMore } =
        await getMissionCompletionsPage(
          items.length,
          PAGE_SIZE,
          searchQuery || undefined
        );
      setItems((prev) => [...prev, ...nextItems]);
      setHasMore(nextHasMore);
    } finally {
      setLoading(false);
    }
  }, [hasMore, items.length, loading, searchQuery]);

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

  return (
    <>
      <div className="mb-4 max-w-xl">
        <label htmlFor="mission-completions-search" className="sr-only">
          Search mission completions
        </label>
        <input
          id="mission-completions-search"
          type="search"
          placeholder="Search by email, profile, or mission..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-forest"
          aria-label="Search mission completions by email, profile, or mission"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200">
          <thead>
            <tr>
              <th className={thClass}>Completed</th>
              <th className={thClass}>Who</th>
              <th className={thClass}>Mission</th>
              <th className={thClass}>Debrief</th>
              <th className={thClass}>Images</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {searchLoading ? (
              <tr>
                <td colSpan={5} className={tdClass + " text-center text-stone-500"}>
                  Searching...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className={tdClass + " text-center text-stone-500"}>
                  {searchQuery.trim()
                    ? "No mission completions match your search."
                    : "No mission completions yet."}
                </td>
              </tr>
            ) : (
              <>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {new Date(row.completed_at).toLocaleString("en-GB")}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        Completion #{row.id}
                      </span>
                    </td>

                    <td className={tdClass}>
                      <span className="block max-w-[240px] truncate text-sm text-stone-900">
                        {row.user_email ?? row.user_id ?? "Unknown account"}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.profile_name ?? "Unknown profile"}
                        {row.profile_nickname ? ` (${row.profile_nickname})` : ""}
                      </span>
                    </td>

                    <td className={tdClass}>
                      <span className="block text-sm text-stone-900">
                        {row.activity_title ?? "Untitled mission"}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.activity_name ?? "Unknown mission"}
                      </span>
                    </td>

                    <td className={tdClass}>
                      <DebriefEntry
                        question={row.debrief_question_1}
                        answer={row.debrief_answer_1}
                        fallbackLabel="Question 1"
                      />
                      <DebriefEntry
                        question={row.debrief_question_2}
                        answer={row.debrief_answer_2}
                        fallbackLabel="Question 2"
                      />
                    </td>

                    <td className={tdClass}>
                      {row.photo_urls.length === 0 ? (
                        <span className="text-sm text-stone-500">No images</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {row.photo_urls.map((url, index) => (
                            <a
                              key={`${row.id}-${index}-${url}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                              title={`View image ${index + 1}`}
                            >
                              <Image
                                src={url}
                                alt={`Mission completion ${row.id} image ${index + 1}`}
                                width={56}
                                height={56}
                                className="h-14 w-14 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {hasMore && (
                  <tr ref={sentinelRef}>
                    <td colSpan={5} className={tdClass + " text-center"}>
                      <span className="text-sm text-stone-500">
                        {loading ? "Loading more..." : "Scroll to load more"}
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

function DebriefEntry({
  question,
  answer,
  fallbackLabel,
}: {
  question: string | null;
  answer: string | null;
  fallbackLabel: string;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-xs font-medium text-stone-600">
        {(question ?? fallbackLabel).trim() || fallbackLabel}
      </p>
      <p className="mt-0.5 whitespace-normal text-sm text-stone-900">
        {answer?.trim() ? answer : "No response"}
      </p>
    </div>
  );
}

const thClass =
  "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500";
const tdClass = "px-6 py-4 align-top text-sm text-stone-700";
