"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";

type Status = "idle" | "submitting" | "success" | "error";

export default function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMessage("Please add your name and email.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("waitlist_signups").insert({
        name: name.trim(),
        email: email.trim(),
        notes: notes.trim() || null,
        source: "website",
      });

      if (error) {
        throw error;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setNotes("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage(
        "We couldn't save your details just now. Please try again in a moment."
      );
    } finally {
      setStatus((prev) => (prev === "success" ? "success" : "idle"));
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-display text-xl font-semibold text-huntly-forest">
          You&apos;re on the list
        </h2>
        <p className="text-sm leading-relaxed text-huntly-slate">
          Thank you for your interest in Huntly World. We&apos;ll be in touch as
          soon as we&apos;re ready for new explorers.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-huntly-slate">
          Join the waitlist
        </h2>
        <p className="text-sm text-huntly-slate">
          Pop in a few details so we can let you know when Huntly World is ready for
          you.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-huntly-forest"
          >
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
            placeholder="Alex Explorer"
            required
            disabled={status === "submitting"}
          />
        </div>
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
            htmlFor="notes"
            className="mb-1 block text-sm font-medium text-huntly-forest"
          >
            Tell us a bit about you (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
            placeholder="Are you a family, school or club? Anything else we should know?"
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
        className="btn-primary w-full justify-center py-3"
      >
        {status === "submitting" ? "Joining waitlist…" : "Join the waitlist"}
      </button>
    </form>
  );
}

