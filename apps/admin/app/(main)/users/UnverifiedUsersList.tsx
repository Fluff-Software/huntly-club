"use client";

import { useEffect, useState } from "react";
import {
  deleteUnverifiedUser,
  verifyUserEmail,
  type UnverifiedUserItem,
} from "./actions";

type Props = {
  initialUsers: UnverifiedUserItem[];
};

export function UnverifiedUsersList({ initialUsers }: Props) {
  const [users, setUsers] = useState<UnverifiedUserItem[]>(initialUsers);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] =
    useState<UnverifiedUserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleDeleteRequest = (user: UnverifiedUserItem) => {
    setDeleteError(null);
    setPendingDelete(user);
  };

  const handleDeleteCancel = () => {
    if (!deleting) setPendingDelete(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return;
    const userId = pendingDelete.id;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteUnverifiedUser(userId);
    setDeleting(false);
    if (res.error) {
      setDeleteError(res.error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setPendingDelete(null);
  };

  const renderActions = (user: UnverifiedUserItem) => (
    <RowActions
      isVerifying={verifying === user.id}
      message={messages[user.id]}
      onVerify={() => handleVerify(user.id)}
      onDelete={() => handleDeleteRequest(user)}
      userLabel={user.email ?? user.id}
    />
  );

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
              Signed up {formatSignedUp(user.created_at)}
            </p>

            <div className="mt-3">{renderActions(user)}</div>
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
                className="w-56 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
              >
                Actions
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
                  {formatSignedUp(user.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                  {renderActions(user)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingDelete && (
        <ConfirmDeleteUnverifiedModal
          userLabel={pendingDelete.email ?? pendingDelete.id}
          signedUpAt={pendingDelete.created_at}
          deleting={deleting}
          error={deleteError}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </>
  );
}

function formatSignedUp(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface RowActionsProps {
  isVerifying: boolean;
  message?: string;
  onVerify: () => void;
  onDelete: () => void;
  userLabel: string;
}

function RowActions({
  isVerifying,
  message,
  onVerify,
  onDelete,
  userLabel,
}: RowActionsProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVerify}
          disabled={isVerifying}
          className="w-fit rounded-lg bg-huntly-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-huntly-forest/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
        >
          {isVerifying ? "Verifying…" : "Verify manually"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isVerifying}
          aria-label={`Delete ${userLabel}`}
          className="w-fit rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
        >
          Delete
        </button>
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}

interface ConfirmDeleteUnverifiedModalProps {
  userLabel: string;
  signedUpAt: string;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDeleteUnverifiedModal({
  userLabel,
  signedUpAt,
  deleting,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteUnverifiedModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-delete-unverified-title"
      aria-describedby="confirm-delete-unverified-description"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-6 py-4">
          <h3
            id="confirm-delete-unverified-title"
            className="text-base font-semibold text-stone-900"
          >
            Delete unverified account
          </h3>
          <p
            id="confirm-delete-unverified-description"
            className="mt-1 text-sm text-stone-600"
          >
            This is{" "}
            <span className="font-semibold text-red-700">permanent</span> and
            can’t be undone. If they still want an account, they’ll need to
            sign up again.
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
            <p className="truncate font-medium text-stone-900" title={userLabel}>
              {userLabel}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Signed up {formatSignedUp(signedUpAt)}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            autoFocus
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
          >
            {deleting ? "Deleting…" : "Yes, delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
