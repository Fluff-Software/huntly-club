"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title?: string;
  message?: string;
  confirmLabel?: string;
  pending?: boolean;
};

export function DenyReasonModal({
  open,
  onClose,
  onConfirm,
  title = "Deny photo",
  message = "Please provide a reason for denying this photo.",
  confirmLabel = "Deny",
  pending = false,
}: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const reasonTrimmed = reason.trim();
  const canConfirm = reasonTrimmed.length > 0;

  async function handleConfirm() {
    if (!canConfirm) return;
    await onConfirm(reasonTrimmed);
    setReason("");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="deny-reason-title"
      aria-describedby="deny-reason-message"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="deny-reason-title" className="text-lg font-semibold text-stone-900">
          {title}
        </h2>
        <p id="deny-reason-message" className="mt-2 text-sm text-stone-600">
          {message}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for denial"
          rows={3}
          required
          className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
          aria-label="Reason for denial (required)"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !canConfirm}
            className="rounded-lg border border-red-300 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
