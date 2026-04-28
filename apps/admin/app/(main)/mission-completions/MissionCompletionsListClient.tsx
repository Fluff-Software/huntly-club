"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMissionCompletionsPage,
  type MissionCompletionItem,
  type MissionCompletionsSortDir,
  type MissionCompletionsSortKey,
} from "./actions";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;
const DATE_LOCALE = "en-GB";

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
  const [sortBy, setSortBy] = useState<MissionCompletionsSortKey>("completed_at");
  const [sortDir, setSortDir] = useState<MissionCompletionsSortDir>("desc");
  const tableSentinelRef = useRef<HTMLTableRowElement | null>(null);
  const cardSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadDone = useRef(false);

  const query = useMemo(
    () => ({
      search: searchQuery || undefined,
      sortBy,
      sortDir,
    }),
    [searchQuery, sortBy, sortDir]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (
      !initialLoadDone.current &&
      searchQuery === "" &&
      sortBy === "completed_at" &&
      sortDir === "desc"
    ) {
      initialLoadDone.current = true;
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    getMissionCompletionsPage(0, PAGE_SIZE, query)
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
  }, [query, searchQuery, sortBy, sortDir]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const { items: nextItems, hasMore: nextHasMore } =
        await getMissionCompletionsPage(items.length, PAGE_SIZE, query);
      setItems((prev) => [...prev, ...nextItems]);
      setHasMore(nextHasMore);
    } finally {
      setLoading(false);
    }
  }, [hasMore, items.length, loading, query]);

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

  const toggleSort = (key: MissionCompletionsSortKey) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir("asc");
  };

  const headerLabel = (label: string, key: MissionCompletionsSortKey) => {
    if (sortBy !== key) return label;
    return `${label} ${sortDir === "asc" ? "↑" : "↓"}`;
  };

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

      {/* Mobile-first: card list (keeps long debrief readable) */}
      <div className="space-y-3 sm:hidden">
        {searchLoading ? (
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500 shadow-sm">
            Searching...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500 shadow-sm">
            {searchQuery.trim()
              ? "No mission completions match your search."
              : "No mission completions yet."}
          </div>
        ) : (
          <>
            <MobileSortBar
              completedLabel={headerLabel("Completed", "completed_at")}
              whoLabel={headerLabel("Who", "who")}
              missionLabel={headerLabel("Mission", "mission")}
              debriefLabel={headerLabel("Debrief", "debrief")}
              onToggleCompletedSort={() => toggleSort("completed_at")}
              onToggleWhoSort={() => toggleSort("who")}
              onToggleMissionSort={() => toggleSort("mission")}
              onToggleDebriefSort={() => toggleSort("debrief")}
            />
            {items.map((row) => (
              <MissionCompletionCard key={row.id} row={row} />
            ))}

            {hasMore && (
              <div
                ref={cardSentinelRef}
                className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-5 text-center text-sm text-stone-500 shadow-sm"
              >
                {loading ? "Loading more..." : "Scroll to load more"}
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
              <th className={thClass}>
                <SortButton
                  label={headerLabel("Completed", "completed_at")}
                  onClick={() => toggleSort("completed_at")}
                />
              </th>
              <th className={thClass}>
                <SortButton label={headerLabel("Who", "who")} onClick={() => toggleSort("who")} />
              </th>
              <th className={thClass}>
                <SortButton
                  label={headerLabel("Mission", "mission")}
                  onClick={() => toggleSort("mission")}
                />
              </th>
              <th className={thClass}>
                <SortButton
                  label={headerLabel("Debrief", "debrief")}
                  onClick={() => toggleSort("debrief")}
                />
              </th>
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
                        {new Date(row.completed_at).toLocaleString(DATE_LOCALE)}
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
                      <ImagesCell rowId={row.id} photoUrls={row.photo_urls} />
                    </td>
                  </tr>
                ))}
                {hasMore && (
                  <tr ref={tableSentinelRef}>
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

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:text-stone-700"
    >
      {label}
    </button>
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

function MissionCompletionCard({
  row,
}: {
  row: MissionCompletionItem;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">Completed</p>
          <p className="mt-0.5 text-sm font-medium text-stone-900">
            {new Date(row.completed_at).toLocaleString(DATE_LOCALE)}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">Completion #{row.id}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">Who</p>
          <p className="mt-0.5 truncate text-sm text-stone-900">
            {row.user_email ?? row.user_id ?? "Unknown account"}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {row.profile_name ?? "Unknown profile"}
            {row.profile_nickname ? ` (${row.profile_nickname})` : ""}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">Mission</p>
          <p className="mt-0.5 text-sm text-stone-900">
            {row.activity_title ?? "Untitled mission"}
          </p>
        </div>

        <details className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
          <summary className="cursor-pointer select-none text-sm font-medium text-stone-700">
            Debrief
          </summary>
          <div className="mt-2">
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
          </div>
        </details>

        <div>
          <p className="text-xs font-medium text-stone-500">Images</p>
          <div className="mt-1">
            <ImagesCell rowId={row.id} photoUrls={row.photo_urls} />
          </div>
        </div>
      </div>
    </article>
  );
}

function MobileSortBar({
  completedLabel,
  whoLabel,
  missionLabel,
  debriefLabel,
  onToggleCompletedSort,
  onToggleWhoSort,
  onToggleMissionSort,
  onToggleDebriefSort,
}: {
  completedLabel: string;
  whoLabel: string;
  missionLabel: string;
  debriefLabel: string;
  onToggleCompletedSort: () => void;
  onToggleWhoSort: () => void;
  onToggleMissionSort: () => void;
  onToggleDebriefSort: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max gap-2 rounded-xl border border-stone-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        <span className="mr-1 self-center text-xs font-medium text-stone-500">Sort</span>
        <button type="button" onClick={onToggleCompletedSort} className={pillClass}>
          {completedLabel}
        </button>
        <button type="button" onClick={onToggleWhoSort} className={pillClass}>
          {whoLabel}
        </button>
        <button type="button" onClick={onToggleMissionSort} className={pillClass}>
          {missionLabel}
        </button>
        <button type="button" onClick={onToggleDebriefSort} className={pillClass}>
          {debriefLabel}
        </button>
      </div>
    </div>
  );
}

function ImagesCell({ rowId, photoUrls }: { rowId: number; photoUrls: string[] }) {
  if (photoUrls.length === 0) {
    return <span className="text-sm text-stone-500">No images</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {photoUrls.map((url, index) => (
        <a
          key={`${rowId}-${index}-${url}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-md border border-stone-200 bg-stone-100"
          title={`View image ${index + 1}`}
        >
          <Image
            src={url}
            alt={`Mission completion ${rowId} image ${index + 1}`}
            width={56}
            height={56}
            className="h-14 w-14 object-cover"
          />
        </a>
      ))}
    </div>
  );
}

const thClass =
  "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500";
const tdClass = "px-6 py-4 align-top text-sm text-stone-700";
const pillClass =
  "rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50 active:bg-stone-100";
