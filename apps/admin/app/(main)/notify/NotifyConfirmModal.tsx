"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { PUSH_DEFAULT_TITLE } from "./push-limits";

const PUSH_CONFIRM_WORD = "SEND";

type Mode = "push" | "email";

export function NotifyConfirmModal({
  open,
  mode,
  emailSubject,
  pushTitle,
  pushMessage,
  pushRecipients,
  pushAudienceLabel,
  previewHtml,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: Mode;
  emailSubject: string;
  pushTitle: string;
  pushMessage: string;
  /** Devices the broadcast will reach; null while counting or if the count failed. */
  pushRecipients: number | null;
  /** Plain-language description of who it goes to. */
  pushAudienceLabel: string;
  previewHtml: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock(open);
  const [confirmText, setConfirmText] = useState("");
  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  if (!open) return null;
  const subject = emailSubject.trim() || "Huntly World update";
  const pushHeading = pushTitle.trim() || PUSH_DEFAULT_TITLE;
  const pushBody = pushMessage.trim() || "(no message)";
  const pushConfirmed = confirmText.trim().toUpperCase() === PUSH_CONFIRM_WORD;
  const confirmDisabled = Boolean(busy) || (mode === "push" && (!pushConfirmed || pushRecipients === 0));

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
              <div className="text-sm font-semibold text-stone-900">{pushHeading}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-stone-900">{pushBody}</div>
              <div className="mt-3 text-xs text-stone-500">
                {pushRecipients == null
                  ? `Goes to ${pushAudienceLabel}.`
                  : `Goes to ${pushRecipients} phone${
                      pushRecipients === 1 ? "" : "s"
                    }: ${pushAudienceLabel}. This can’t be undone.`}
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

        {mode === "push" && (
          <div className="mt-5">
            <label className="block text-sm font-medium text-stone-700">
              Type {PUSH_CONFIRM_WORD} to send
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={Boolean(busy)}
              autoFocus
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
              placeholder={PUSH_CONFIRM_WORD}
            />
            {busy && (
              <div className="mt-2 text-xs text-stone-500">
                Sending and checking delivery receipts. This takes about 15 seconds.
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={confirmDisabled}>
            {busy ? "Sending..." : mode === "push" ? "Send Notification" : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
