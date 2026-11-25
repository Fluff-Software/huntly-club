"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { NotifyConfirmModal } from "./NotifyConfirmModal";
import { RichTextEditor } from "./RichTextEditor";
import {
  getPushRecipientCount,
  sendAdminEmail,
  sendAdminEmailTest,
  sendAdminPush,
  previewAdminEmail,
  type PushReport,
  type PushUserSearchItem,
} from "./actions";
import {
  INACTIVE_DAY_OPTIONS,
  PUSH_DEFAULT_TITLE,
  PUSH_MESSAGE_MAX,
  PUSH_TITLE_MAX,
  type PushAudience,
} from "./push-limits";
import { PushAudiencePicker, type AudienceType } from "./PushAudiencePicker";

function describeAudience(audience: PushAudience, selectedUsers: PushUserSearchItem[]): string {
  if (audience.type === "all") return "everyone with notifications on";
  if (audience.type === "inactive") {
    const label =
      INACTIVE_DAY_OPTIONS.find((o) => o.days === audience.days)?.label ?? `${audience.days} days`;
    return `people who haven’t used the app for ${label} or more`;
  }
  const emails = selectedUsers.map((u) => u.email ?? u.user_id);
  return emails.length <= 3
    ? emails.join(", ")
    : `${emails.slice(0, 3).join(", ")} and ${emails.length - 3} more`;
}

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

function describePushReport(report: PushReport, recipients: number): string {
  const parts = [`Expo accepted ${report.accepted} of ${recipients} devices.`];
  const { ok, failed, pending } = report.receipts;
  if (ok || failed) parts.push(`Delivered to Apple/Google: ${ok}${failed ? `, failed: ${failed}` : ""}.`);
  if (pending) parts.push(`${pending} still processing (not an error).`);
  if (report.disabledTokens) {
    parts.push(`${report.disabledTokens} uninstalled device${report.disabledTokens === 1 ? "" : "s"} turned off.`);
  }
  const errors = Object.entries(report.errorCounts);
  if (errors.length) parts.push(`Errors: ${errors.map(([code, n]) => `${code} ×${n}`).join(", ")}.`);
  return parts.join(" ");
}

function PushPreview({ title, message }: { title: string; message: string }) {
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
              <span className="truncate text-sm font-semibold text-stone-900">
                {title.trim() || PUSH_DEFAULT_TITLE}
              </span>
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
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushRecipients, setPushRecipients] = useState<number | null>(null);
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [inactiveDays, setInactiveDays] = useState<number>(30);
  const [selectedUsers, setSelectedUsers] = useState<PushUserSearchItem[]>([]);
  const audience = useMemo<PushAudience>(() => {
    if (audienceType === "inactive") return { type: "inactive", days: inactiveDays };
    if (audienceType === "users") return { type: "users", userIds: selectedUsers.map((u) => u.user_id) };
    return { type: "all" };
  }, [audienceType, inactiveDays, selectedUsers]);
  const audienceIncomplete = audience.type === "users" && audience.userIds.length === 0;
  const [pushRecipientsError, setPushRecipientsError] = useState<string | null>(null);

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

  const pushTooLong =
    pushTitle.trim().length > PUSH_TITLE_MAX || pushMessage.trim().length > PUSH_MESSAGE_MAX;

  const disabled =
    (mode === "email"
      ? emailBodyHtml.trim().length === 0
      : pushMessage.trim().length === 0 ||
        pushTooLong ||
        audienceIncomplete ||
        pushRecipients === 0) || isPending;

  const refreshPushRecipients = useCallback(() => {
    setPushRecipientsError(null);
    if (audience.type === "users" && audience.userIds.length === 0) {
      setPushRecipients(null);
      return;
    }
    setPushRecipients(null);
    getPushRecipientCount(audience).then((res) => {
      if (!res.success || typeof res.recipients !== "number") {
        setPushRecipients(null);
        setPushRecipientsError(res.error ?? "Couldn't count devices.");
        return;
      }
      setPushRecipients(res.recipients);
    });
  }, [audience]);

  useEffect(() => {
    if (mode !== "push") return;
    const handle = setTimeout(refreshPushRecipients, 250);
    return () => clearTimeout(handle);
  }, [mode, refreshPushRecipients]);

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
    if (mode === "push") refreshPushRecipients();
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
      if (mode === "push") {
        const res = await sendAdminPush(pushTitle, pushMessage, audience);
        if (!res?.success) {
          setError(
            [res?.error ?? "Failed to send. Please try again.", res?.report && describePushReport(res.report, res.recipients ?? 0)]
              .filter(Boolean)
              .join(" ")
          );
          setConfirmOpen(false);
          return;
        }
        const recipients = res.recipients ?? 0;
        setSuccess(
          res.report
            ? `Notification sent. ${describePushReport(res.report, recipients)}`
            : `Notification sent (${recipients} devices).`
        );
        // Clear the form so the same broadcast can't be sent twice by accident.
        setPushTitle("");
        setPushMessage("");
        setConfirmOpen(false);
        refreshPushRecipients();
        return;
      }

      const res = await sendAdminEmail(emailSubject, emailBodyHtml);

      if (!res?.success) {
        setError(res?.error ?? "Failed to send. Please try again.");
        return;
      }

      const count = typeof res.count === "number" ? res.count : undefined;
      setSuccess(`Email sent${count != null ? ` (${count})` : ""}.`);
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
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                pushRecipientsError
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              {pushRecipientsError
                ? pushRecipientsError
                : audienceIncomplete
                  ? "Pick at least one person below."
                  : pushRecipients == null
                    ? "Counting phones…"
                    : pushRecipients === 0
                      ? "Nobody in this group has notifications on, so there’s no one to send to."
                      : `Goes to ${pushRecipients} phone${pushRecipients === 1 ? "" : "s"}: ${describeAudience(audience, selectedUsers)}.`}
            </div>

            <div className="mb-5">
              <PushAudiencePicker
                type={audienceType}
                onTypeChange={setAudienceType}
                inactiveDays={inactiveDays}
                onInactiveDaysChange={setInactiveDays}
                selectedUsers={selectedUsers}
                onSelectedUsersChange={setSelectedUsers}
                disabled={isPending}
              />
            </div>

            <label className="block text-sm font-medium text-stone-700">Title</label>
            <input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              maxLength={PUSH_TITLE_MAX}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
              placeholder={PUSH_DEFAULT_TITLE}
            />
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                If left blank, we’ll use “{PUSH_DEFAULT_TITLE}”.
              </div>
              <div className="text-xs text-stone-500">
                {pushTitle.trim().length}/{PUSH_TITLE_MAX}
              </div>
            </div>

            <label className="mt-4 block text-sm font-medium text-stone-700">Message</label>
            <textarea
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              rows={5}
              maxLength={PUSH_MESSAGE_MAX}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-huntly-sage focus:ring-2 focus:ring-huntly-sage/30"
              placeholder="Type the message users will receive as a push notification..."
            />
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="text-xs text-stone-500">Sent as plain text, no formatting.</div>
              <div
                className={`text-xs ${
                  pushMessage.trim().length > PUSH_MESSAGE_MAX ? "text-red-600" : "text-stone-500"
                }`}
              >
                {pushMessage.trim().length}/{PUSH_MESSAGE_MAX}
              </div>
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
            <PushPreview title={pushTitle} message={pushMessage} />
          </div>
        )}
      </div>

      <NotifyConfirmModal
        open={confirmOpen}
        mode={mode}
        emailSubject={emailSubject}
        pushTitle={pushTitle}
        pushMessage={pushMessage}
        pushRecipients={pushRecipients}
        pushAudienceLabel={describeAudience(audience, selectedUsers)}
        previewHtml={previewHtml}
        busy={isPending}
        onClose={closeConfirm}
        onConfirm={confirmSend}
      />
    </div>
  );
}
