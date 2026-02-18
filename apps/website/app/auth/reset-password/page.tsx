"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

type Status = "loading" | "ready" | "invalid" | "success" | "error";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) {
      setStatus("invalid");
      return;
    }
    const params = new URLSearchParams(hash.slice(1)); // remove #
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setStatus("invalid");
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        setStatus("ready");
        // Clear hash from URL so tokens aren’t visible
        window.history.replaceState(null, "", window.location.pathname);
      })
      .catch(() => setStatus("invalid"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="section flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md text-center">
          <p className="text-sm leading-relaxed text-huntly-slate">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="section flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md text-center">
          <h1 className="mb-3 font-display text-2xl font-semibold text-huntly-forest">
            Invalid or expired link
          </h1>
          <p className="text-sm leading-relaxed text-huntly-slate">
            This password reset link is invalid or has expired. Please request a new one from the app.
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="section flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md text-center">
          <h1 className="mb-3 font-display text-2xl font-semibold text-huntly-forest">
            Password updated
          </h1>
          <p className="text-sm leading-relaxed text-huntly-slate">
            Your password has been updated. You can now sign in to the Huntly World app with your new password.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="section flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md text-center">
          <h1 className="mb-3 font-display text-2xl font-semibold text-huntly-alert">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-huntly-slate">
            {errorMessage ?? "Failed to update password. The link may have expired."}
          </p>
          <p className="mt-4 text-sm text-huntly-slate">
            Please try requesting a new reset link from the app.
          </p>
        </div>
      </div>
    );
  }

  // status === "ready" – show form
  return (
    <div className="section flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="mb-2 font-display text-2xl font-semibold text-huntly-forest">
          Set new password
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-huntly-slate">
          Enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-huntly-forest">
              New password
            </label>
            <input
              id="password"
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
              placeholder="At least 6 characters"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-huntly-forest">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
              placeholder="Repeat your password"
              required
              disabled={submitting}
            />
          </div>
          {errorMessage && (
            <p className="text-sm text-huntly-alert">{errorMessage}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary mt-2 py-3"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
