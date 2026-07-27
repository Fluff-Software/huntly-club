"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

type Status = "loading" | "ready" | "invalid" | "success" | "error";

/** Deduplicate Strict Mode double-mount so the one-time token_hash is only verified once. */
const verifyInflight = new Map<
  string,
  Promise<{ error: { message: string; code?: string } | null }>
>();

function verifyRecoveryToken(
  tokenHash: string,
  otpType: "recovery" | "email" | "signup" | "invite" | "magiclink" | "email_change"
) {
  const existing = verifyInflight.get(tokenHash);
  if (existing) return existing;
  const supabase = createClient();
  const promise = supabase.auth
    .verifyOtp({ token_hash: tokenHash, type: otpType })
    .then(({ error }) => ({
      error: error
        ? { message: error.message, code: (error as { code?: string }).code }
        : null,
    }));
  verifyInflight.set(tokenHash, promise);
  return promise;
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function detectMfaRequirement() {
    const supabase = createClient();
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || !aal) return;
    if (aal.currentLevel === "aal2" || aal.nextLevel !== "aal2") return;

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");
    if (totp) {
      setMfaFactorId(totp.id);
      setMfaRequired(true);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const search = typeof window !== "undefined" ? window.location.search : "";
      const queryParams = search
        ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
        : null;
      const tokenHash = queryParams?.get("token_hash");
      const otpType = queryParams?.get("type") ?? "recovery";

      const supabase = createClient();

      // Prefer token_hash (query) — consumed via POST verifyOtp, safe from email prefetch GETs
      if (tokenHash) {
        const { error } = await verifyRecoveryToken(
          tokenHash,
          otpType as
            | "recovery"
            | "email"
            | "signup"
            | "invite"
            | "magiclink"
            | "email_change"
        );
        if (cancelled) return;
        if (error) {
          setStatus("invalid");
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
        await detectMfaRequirement();
        if (cancelled) return;
        setStatus("ready");
        return;
      }

      if (!hash) {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          await detectMfaRequirement();
          if (cancelled) return;
          setStatus("ready");
          return;
        }
        setStatus("invalid");
        return;
      }

      const params = new URLSearchParams(hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        setStatus("invalid");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (cancelled) return;
      if (error) {
        setStatus("invalid");
        return;
      }
      window.history.replaceState(null, "", window.location.pathname);
      await detectMfaRequirement();
      if (cancelled) return;
      setStatus("ready");
    };

    run().catch(() => {
      if (!cancelled) setStatus("invalid");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const elevateToAal2 = async (supabase: ReturnType<typeof createClient>) => {
    if (!mfaFactorId) {
      return { error: new Error("MFA is required but no authenticator was found.") };
    }
    if (!mfaCode.trim()) {
      return { error: new Error("Enter the 6-digit code from your authenticator app.") };
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
    if (challengeError || !challengeData) {
      return { error: challengeError ?? new Error("Could not start MFA verification.") };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code: mfaCode.trim(),
    });
    return { error: verifyError };
  };

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
    if (mfaRequired && !mfaCode.trim()) {
      setErrorMessage("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const supabase = createClient();

      if (mfaRequired) {
        const { error: mfaError } = await elevateToAal2(supabase);
        if (mfaError) {
          setErrorMessage("That authenticator code didn't work. Please try again.");
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        if (error.message.includes("AAL2")) {
          setMfaRequired(true);
          setErrorMessage(
            "Enter the 6-digit code from your authenticator app, then try again."
          );
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp?.find((f) => f.status === "verified");
          if (totp) setMfaFactorId(totp.id);
          return;
        }
        if (/different from the old password/i.test(error.message)) {
          setErrorMessage("Choose a password that is different from your current one.");
          return;
        }
        setErrorMessage(
          error.message || "We couldn't update your password. Give it another try?"
        );
        return;
      }
      setStatus("success");
    } catch {
      setErrorMessage("We couldn't update your password. Give it another try?");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="section flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md text-center">
          <p className="text-sm leading-relaxed text-huntly-slate">Getting things ready…</p>
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
            This link has expired or isn&apos;t valid. Request a new one from the app and try again.
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
            {errorMessage ??
              "We couldn't update your password. The link may have expired - request a new one from the app and try again."}
          </p>
          <p className="mt-4 text-sm text-huntly-slate">
            Request a new reset link from the app and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="section flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="mb-2 font-display text-2xl font-semibold text-huntly-forest">
          Set new password
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-huntly-slate">
          {mfaRequired
            ? "Enter your new password and the 6-digit code from your authenticator app."
            : "Enter your new password below."}
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
          {mfaRequired && (
            <div>
              <label htmlFor="mfa" className="mb-1 block text-sm font-medium text-huntly-forest">
                Authenticator code
              </label>
              <input
                id="mfa"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={8}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
                placeholder="6-digit code"
                required
                disabled={submitting}
              />
            </div>
          )}
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
