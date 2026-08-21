"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { NotifyConfirmModal } from "./NotifyConfirmModal";
import { RichTextEditor } from "./RichTextEditor";
import { sendAdminEmail, sendAdminEmailTest, sendAdminPush, previewAdminEmail } from "./actions";

type Mode = "push" | "email";

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-stone-300 bg-stone-100 p-1">
      {(["email", "push"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === m
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          {m === "email" ? "Email" : "Push Notification"}
        </button>
      ))}
    </div>
  );
}

function PushPreview({ message }: { message: string }) {
  const trimmed = message.trim();
  return (
    <div className="rounded-2xl bg-stone-800 p-6">
      <div className="mx-auto max-w-sm rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-huntly-forest text-sm font-bold text-white">
            H
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-stone-900">Huntly World</span>
              <span className="shrink-0 text-xs text-stone-400">now</span>
            </div>
            <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-stone-700">
              {trimmed || <span className="text-stone-400">(no message)</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotifyPage() {
  const [mode, setMode] = useState<Mode>("email");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [pushMessage, setPushMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const disabled =
    (mode === "email" ? emailBodyHtml.trim().length === 0 : pushMessage.trim().length === 0) ||
    isPending;

  const refreshPreview = useCallback(() => {
    const html = emailBodyHtml.trim();
    if (!html) {
      setPreviewHtml(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    previewAdminEmail(emailSubject, html)
      .then((res) => {
        if (!res.success || !res.html) {
          setPreviewError(res.error ?? "Failed to render preview.");
          setPreviewHtml(null);
          return;
        }
        setPreviewHtml(res.html);
      })
      .finally(() => setPreviewLoading(false));
  }, [emailSubject, emailBodyHtml]);

  // Debounced live preview as the admin types (email mode only).
  useEffect(() => {
    if (mode !== "email") return;
    const handle = setTimeout(refreshPreview, 500);
    return () => clearTimeout(handle);
  }, [mode, refreshPreview]);

  function openConfirm() {
    setError(null);
    setSuccess(null);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (isPending) return;
    setConfirmOpen(false);
  }

  function confirmSend() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res =
        mode === "push"
          ? await sendAdminPush(pushMessage)
          : await sendAdminEmail(emailSubject, emailBodyHtml);

      if (!res?.success) {
        setError(res?.error ?? "Failed to send. Please try again.");
        return;
      }

      const count = typeof res.count === "number" ? res.count : undefined;
      setSuccess(
        mode === "push"
          ? `Notification sent${count != null ? ` (${count})` : ""}.`
          : `Email sent${count != null ? ` (${count})` : ""}.`
      );
      setConfirmOpen(false);
    });
  }

  function sendTest() {
    const to = testEmail.trim();
    if (!to || !emailBodyHtml.trim()) return;
    setTestSending(true);
    setTestResult(null);
    sendAdminEmailTest(emailSubject, emailBodyHtml, to)
      .then((res) => {
        setTestResult(res.success ? `Test email sent to ${to}.` : res.error ?? "Failed to send test.");
      })
      .finally(() => setTestSending(false));
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-stone-900">Notify</div>
        <div className="mt-1 text-sm text-stone-600">
          Send a push notification or email to users.
        </div>
      </div>

      <div className="mb-6">
        <ModeSwitch
          mode={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
            setSuccess(null);
          }}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        {mode === "email" ? (
          <>
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
              If left blank, we’ll use “Huntly World update”.
            </div>

            <label className="mt-4 block text-sm font-medium text-stone-700">Message</label>
            <div className="mt-2">
              <RichTextEditor value={emailBodyHtml} onChange={setEmailBodyHtml} />
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-stone-700">Message</label>
            <textarea
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
              placeholder="Type the message users will receive as a push notification..."
            />
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="text-xs text-stone-500">Sent as plain text, no formatting.</div>
              <div className="text-xs text-stone-500">{pushMessage.trim().length} chars</div>
            </div>
          </>
        )}

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

        <div className="mt-5">
          <Button variant="primary" onClick={openConfirm} disabled={disabled}>
            {mode === "email" ? "Send Email" : "Send Notification"}
          </Button>
        </div>

        {mode === "email" && (
          <div className="mt-6 border-t border-stone-200 pt-5">
            <label className="block text-sm font-medium text-stone-700">
              Send yourself a test first
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
              />
              <Button
                variant="secondary"
                onClick={sendTest}
                disabled={!testEmail.trim() || disabled || testSending}
              >
                {testSending ? "Sending…" : "Send Test Email"}
              </Button>
            </div>
            {testResult && <div className="mt-2 text-xs text-stone-600">{testResult}</div>}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-stone-700">
            {mode === "email" ? "Email preview" : "Push notification preview"}
          </div>
          {mode === "email" && previewLoading && (
            <div className="text-xs text-stone-400">Refreshing…</div>
          )}
        </div>
        {mode === "email" ? (
          <>
            {previewError && <div className="mt-2 text-xs text-red-600">{previewError}</div>}
            {previewHtml ? (
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="mt-3 h-[520px] w-full rounded-xl border border-stone-200"
              />
            ) : (
              <div className="mt-3 text-sm text-stone-400">
                Start typing a message to see the real email preview here.
              </div>
            )}
          </>
        ) : (
          <div className="mt-3">
            <PushPreview message={pushMessage} />
          </div>
        )}
      </div>

      <NotifyConfirmModal
        open={confirmOpen}
        mode={mode}
        emailSubject={emailSubject}
        pushMessage={pushMessage}
        previewHtml={previewHtml}
        busy={isPending}
        onClose={closeConfirm}
        onConfirm={confirmSend}
      />
    </div>
  );
}
