"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";

type Status = "idle" | "submitting" | "success";

export default function FeedbackForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [happyToBeContacted, setHappyToBeContacted] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      setErrorMessage("Please fill in your email and feedback.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("submit-contact-form", {
        body: {
          formName: "Feedback",
          email: email.trim(),
          message: message.trim(),
          fields: {
            "Happy to be contacted": happyToBeContacted ? "Yes" : "No",
          },
        },
      });

      if (error) {
        throw error;
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setErrorMessage("We couldn't send your feedback just now. Please try again in a moment.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-display text-xl font-semibold text-huntly-forest">Thank you!</h2>
        <p className="text-sm leading-relaxed text-huntly-slate">
          Your feedback has been sent to our team. We read every message.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-huntly-forest">
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
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-huntly-forest">
            Your feedback
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border-2 border-huntly-stone bg-white px-4 py-3 text-[var(--color-text-main)] placeholder:text-huntly-slate focus:border-huntly-leaf focus:outline-none focus:ring-2 focus:ring-huntly-leaf/20"
            placeholder="Tell us your thoughts, experiences, or ideas"
            required
            disabled={status === "submitting"}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-huntly-slate">
          <input
            type="checkbox"
            checked={happyToBeContacted}
            onChange={(e) => setHappyToBeContacted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-huntly-stone text-huntly-leaf focus:ring-huntly-leaf/40"
            disabled={status === "submitting"}
          />
          I&apos;m happy to be contacted for further information
        </label>
      </div>

      {errorMessage && <p className="text-sm text-huntly-alert">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full justify-center rounded-xl border-2 border-huntly-leaf bg-huntly-leaf px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1a6a5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
