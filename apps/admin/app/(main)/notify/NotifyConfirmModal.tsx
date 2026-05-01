"use client";

import { Button } from "@/components/Button";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Mode = "push" | "email";

function getPreview(mode: Mode, message: string, emailSubject: string) {
  const trimmed = message.trim();
  const safe = trimmed || "(no message)";

  if (mode === "push") {
    return {
      heading: "Push notification preview",
      title: "Huntly World",
      body: safe,
      footer: "Delivered as a mobile push notification.",
    };
  }

  const subject = emailSubject.trim() || "Huntly World update";
  const htmlBody = safe;

  return {
    heading: "Email preview",
    subject,
    body: htmlBody,
    footer: "Delivered as an email to opted-in users.",
  };
}

export function NotifyConfirmModal({
  open,
  mode,
  emailSubject,
  message,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: Mode;
  emailSubject: string;
  message: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock(open);

  if (!open) return null;
  const preview = getPreview(mode, message, emailSubject);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : onClose}
        aria-label="Close modal"
      />
      <div className="relative mx-auto mt-24 w-[min(720px,calc(100vw-2rem))] rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-stone-900">Are you sure?</div>
            <div className="mt-1 text-sm text-stone-600">{preview.heading}</div>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={Boolean(busy)}>
            Close
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
          {mode === "push" ? (
            <div className="max-w-md">
              <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {preview.title}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-stone-900">
                {(preview as any).body}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm">
                <span className="font-medium text-stone-700">Subject:</span>{" "}
                <span className="text-stone-900">{(preview as any).subject}</span>
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-900">
                {(preview as any).body}
              </div>
            </div>
          )}
          <div className="mt-3 text-xs text-stone-500">{preview.footer}</div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={Boolean(busy)}>
            {busy ? "Sending..." : mode === "push" ? "Send Notification" : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

