"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUsersListPage, type UserListItem } from "./actions";
import { UserDetailModal } from "./UserDetailModal";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  initialUsers: UserListItem[];
  initialHasMore: boolean;
};

export function UsersListWithModal({
  initialUsers,
  initialHasMore,
}: Props) {
  const [users, setUsers] = useState<UserListItem[]>(initialUsers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
    getUsersListPage(0, PAGE_SIZE, searchQuery || undefined)
      .then(({ users: nextUsers, hasMore: nextHasMore }) => {
        if (!cancelled) {
          setUsers(nextUsers);
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
      const { users: nextUsers, hasMore: nextHasMore } = await getUsersListPage(
        users.length,
        PAGE_SIZE,
        searchQuery || undefined
      );
      setUsers((prev) => [...prev, ...nextUsers]);
      setHasMore(nextHasMore);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, users.length, searchQuery]);

  const sentinelVisible = hasMore && users.length > 0 && !searchLoading;

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

  function openModal(userId: string) {
    setSelectedUserId(userId);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedUserId(null);
  }

  function handleUserDeleted(deletedUserId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== deletedUserId));
    closeModal();
  }

  return (
    <>
      <div className="mb-4 max-w-2xl">
        <label htmlFor="users-search" className="sr-only">
          Search users by email
        </label>
        <input
          id="users-search"
          type="search"
          placeholder="Search by email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-huntly-forest focus:outline-none focus:ring-1 focus:ring-huntly-forest"
          aria-label="Search users by email"
        />
      </div>
      <div className="max-w-2xl overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full divide-y divide-stone-200">
          <thead>
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                Email
              </th>
              <th
                scope="col"
                className="w-16 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                Profiles
              </th>
              <th
                scope="col"
                className="w-28 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {searchLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-stone-500">
                  Searching…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-stone-500">
                  {searchQuery.trim() ? "No users match your search." : "No users."}
                </td>
              </tr>
            ) : (
              <>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openModal(user.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openModal(user.id);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-inset"
                  >
                    <td className="max-w-[240px] truncate px-4 py-2.5 text-sm font-medium text-stone-900" title={user.email ?? user.id}>
                      {user.email ?? user.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-stone-600">
                      {user.profile_count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-stone-500">
                      {new Date(user.created_at).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
                {hasMore && (
                  <tr ref={sentinelRef}>
                    <td colSpan={3} className="px-4 py-3 text-center">
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

      <UserDetailModal
        userId={selectedUserId}
        open={modalOpen}
        onClose={closeModal}
        onDeleted={handleUserDeleted}
      />
    </>
  );
}
