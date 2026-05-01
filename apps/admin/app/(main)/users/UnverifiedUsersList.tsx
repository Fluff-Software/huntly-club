"use client";

import { useState } from "react";
import { verifyUserEmail, type UnverifiedUserItem } from "./actions";

type Props = {
  initialUsers: UnverifiedUserItem[];
};

export function UnverifiedUsersList({ initialUsers }: Props) {
  const [users, setUsers] = useState<UnverifiedUserItem[]>(initialUsers);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  if (users.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
        No unverified accounts.
      </p>
    );
  }

  const handleVerify = async (userId: string) => {
    setVerifying(userId);
    setMessages((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    const res = await verifyUserEmail(userId);
    setVerifying(null);
    if (res.error) {
      setMessages((prev) => ({ ...prev, [userId]: res.error! }));
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {users.map((user) => (
          <article
            key={user.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <p
              className="truncate text-sm font-medium text-stone-900"
              title={user.email ?? user.id}
            >
              {user.email ?? user.id}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Signed up{" "}
              {new Date(user.created_at).toLocaleString("en-GB", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>

            <div className="mt-3 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleVerify(user.id)}
                disabled={verifying === user.id}
                className="w-fit rounded-lg bg-huntly-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-huntly-forest/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
              >
                {verifying === user.id ? "Verifying…" : "Verify manually"}
              </button>
              {messages[user.id] && (
                <p className="text-xs text-red-600">{messages[user.id]}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm sm:block">
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
                className="w-28 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                Signed up
              </th>
              <th
                scope="col"
                className="w-36 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td
                  className="max-w-[240px] truncate px-4 py-2.5 text-sm font-medium text-stone-900"
                  title={user.email ?? user.id}
                >
                  {user.email ?? user.id}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-stone-500">
                  {new Date(user.created_at).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleVerify(user.id)}
                      disabled={verifying === user.id}
                      className="w-fit rounded-lg bg-huntly-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-huntly-forest/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
                    >
                      {verifying === user.id ? "Verifying…" : "Verify manually"}
                    </button>
                    {messages[user.id] && (
                      <p className="text-xs text-red-600">{messages[user.id]}</p>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
