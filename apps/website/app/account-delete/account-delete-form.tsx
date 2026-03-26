"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";

type Status = "idle" | "submitting" | "success";

export default function AccountDeleteForm() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("request-account-deletion", {
        body: { email: email.trim(), reason: reason.trim() || undefined },
      });

      if (error) {
        throw error;
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "We couldn't submit your request just now. Please try again in a moment."
      );
    } finally {
      setStatus((prev) => (prev === "success" ? "success" : "idle"));
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-display text-xl font-semibold text-huntly-forest">
          Request received
        </h2>
        <p className="text-sm leading-relaxed text-huntly-slate">
          If an account exists for that email address, you&apos;ll receive a
          confirmation email shortly. An admin will review your request and your
          account data will be permanently removed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-huntly-slate">
          Request account deletion
        </h2>
        <p className="text-sm text-huntly-slate">
          Enter the email address associated with your account. If your account
          exists, we&apos;ll submit a removal request and send you a confirmation
          email.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-huntly-forest"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
            placeholder="you@example.com"
            required
            disabled={status === "submitting"}
          />
        </div>
        <div>
          <label
            htmlFor="reason"
            className="mb-1 block text-sm font-medium text-huntly-forest"
          >
            Reason for deletion (optional)
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
            placeholder="Tell us why you'd like your account removed"
            disabled={status === "submitting"}
          />
        </div>
      </div>

      {errorMessage && (
        <p className="text-sm text-huntly-alert">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full justify-center rounded-xl border-2 border-huntly-alert bg-transparent px-5 py-3 text-sm font-semibold text-huntly-alert transition hover:bg-huntly-alert/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-alert focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Request account deletion"}
      </button>
    </form>
  );
}
