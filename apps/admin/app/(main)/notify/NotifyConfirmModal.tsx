"use client";

import { Button } from "@/components/Button";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Mode = "push" | "email";

export function NotifyConfirmModal({
  open,
  mode,
  emailSubject,
  pushMessage,
  previewHtml,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: Mode;
  emailSubject: string;
  pushMessage: string;
  previewHtml: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock(open);

  if (!open) return null;
  const subject = emailSubject.trim() || "Huntly World update";
  const pushBody = pushMessage.trim() || "(no message)";

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
            <div className="mt-1 text-sm text-stone-600">
              {mode === "push" ? "Push notification preview" : "Email preview"}
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={Boolean(busy)}>
            Close
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
          {mode === "push" ? (
            <div className="max-w-md">
              <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Huntly World
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-stone-900">{pushBody}</div>
              <div className="mt-3 text-xs text-stone-500">
                Delivered as a mobile push notification.
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm">
                <span className="font-medium text-stone-700">Subject:</span>{" "}
                <span className="text-stone-900">{subject}</span>
              </div>
              {previewHtml ? (
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="mt-3 h-[420px] w-full rounded-lg border border-stone-200 bg-white"
                />
              ) : (
                <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-500">
                  Preview not available.
                </div>
              )}
              <div className="mt-3 text-xs text-stone-500">
                Delivered to users who haven’t turned off general emails.
              </div>
            </div>
          )}
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
