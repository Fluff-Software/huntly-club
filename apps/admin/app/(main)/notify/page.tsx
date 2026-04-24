"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { NotifyConfirmModal } from "./NotifyConfirmModal";
import { sendAdminEmail, sendAdminPush } from "./actions";

type Mode = "push" | "email";

export default function NotifyPage() {
  const [emailSubject, setEmailSubject] = useState("");
  const [message, setMessage] = useState("");
  const [modalMode, setModalMode] = useState<Mode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmed = message.trim();
  const disabled = trimmed.length === 0 || isPending;

  const helper = useMemo(() => {
    const n = trimmed.length;
    if (n === 0) return "Type a message to send to users.";
    if (n < 10) return "Consider adding a bit more detail.";
    return "This message will be sent to all opted-in recipients.";
  }, [trimmed.length]);

  function openConfirm(mode: Mode) {
    setError(null);
    setSuccess(null);
    setModalMode(mode);
  }

  function closeConfirm() {
    if (isPending) return;
    setModalMode(null);
  }

  function confirmSend() {
    if (!modalMode) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res =
        modalMode === "push"
          ? await sendAdminPush(message)
          : await sendAdminEmail(emailSubject, message);

      if (!res?.success) {
        setError(res?.error ?? "Failed to send. Please try again.");
        return;
      }

      const count = typeof res.count === "number" ? res.count : undefined;
      setSuccess(
        modalMode === "push"
          ? `Notification sent${count != null ? ` (${count})` : ""}.`
          : `Email sent${count != null ? ` (${count})` : ""}.`
      );
      setModalMode(null);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-stone-900">Notify</div>
        <div className="mt-1 text-sm text-stone-600">
          Send a push notification or email to users.
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-stone-700">
          Email subject (title)
        </label>
        <input
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
          placeholder="Huntly World update"
        />
        <div className="mt-2 text-xs text-stone-500">
          Used for <span className="font-medium">emails</span> only. If left blank, we’ll use
          “Huntly World update”.
        </div>

        <label className="block text-sm font-medium text-stone-700">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
          placeholder="Type the message users will receive..."
        />
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="text-xs text-stone-500">{helper}</div>
          <div className="text-xs text-stone-500">{trimmed.length} chars</div>
        </div>

        {(error || success) && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
            role={error ? "alert" : "status"}
          >
            {error ?? success}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            onClick={() => openConfirm("push")}
            disabled={disabled}
          >
            Send Notification
          </Button>
          <Button
            variant="secondary"
            onClick={() => openConfirm("email")}
            disabled={disabled}
          >
            Send Email
          </Button>
        </div>
      </div>

      <NotifyConfirmModal
        open={modalMode != null}
        mode={(modalMode ?? "push") as Mode}
        emailSubject={emailSubject}
        message={message}
        busy={isPending}
        onClose={closeConfirm}
        onConfirm={confirmSend}
      />
    </div>
  );
}

