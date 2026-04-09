"use client";

import { useState } from "react";
import { type UserListItem, type UnverifiedUserItem } from "./actions";
import { UsersListWithModal } from "./UsersListWithModal";
import { UnverifiedUsersList } from "./UnverifiedUsersList";

type Props = {
  initialUsers: UserListItem[];
  initialHasMore: boolean;
  unverifiedUsers: UnverifiedUserItem[];
  unverifiedError?: string;
};

const TABS = [
  { id: "users", label: "Users" },
  { id: "pending", label: "Pending verification" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function UsersTabs({
  initialUsers,
  initialHasMore,
  unverifiedUsers,
  unverifiedError,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <div>
      <div className="mb-6 border-b border-stone-200">
        <nav className="-mb-px flex gap-6" aria-label="Users tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-huntly-sage ${
                activeTab === tab.id
                  ? "border-huntly-forest text-huntly-forest"
                  : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
              {tab.id === "pending" && unverifiedUsers.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {unverifiedUsers.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "users" && (
        <UsersListWithModal
          initialUsers={initialUsers}
          initialHasMore={initialHasMore}
        />
      )}

      {activeTab === "pending" && (
        <>
          {unverifiedError ? (
            <p className="rounded-xl border border-dashed border-red-300 bg-red-50/50 py-6 text-center text-sm text-red-600">
              Failed to load unverified accounts: {unverifiedError}
            </p>
          ) : (
            <UnverifiedUsersList initialUsers={unverifiedUsers} />
          )}
        </>
      )}
    </div>
  );
}
