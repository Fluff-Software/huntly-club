"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";

type Status = "idle" | "submitting" | "success";

export default function PartnersEnquiryForm() {
  const [name, setName] = useState("");
  const [attraction, setAttraction] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !attraction.trim()) {
      setErrorMessage("Please fill in your attraction name and email address.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("submit-contact-form", {
        body: {
          formName: `Partner Enquiry: ${attraction.trim()}`,
          email: email.trim(),
          message: message.trim() || "(No additional details provided)",
          fields: {
            Name: name.trim(),
            Attraction: attraction.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setErrorMessage("We couldn't submit your enquiry just now. Please try again in a moment.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <p className="font-display text-xl font-bold text-brand-green">Thanks — we&apos;ll be in touch!</p>
        <p className="text-sm text-brand-muted">
          We&apos;ve received your enquiry and someone from our team will reach out shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-brand-green">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-2 border-brand-tan/60 bg-white px-4 py-3 text-brand-green placeholder:text-brand-muted focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            placeholder="Jane Smith"
            disabled={status === "submitting"}
          />
        </div>
        <div>
          <label htmlFor="attraction" className="mb-1 block text-sm font-medium text-brand-green">
            Attraction name
          </label>
          <input
            id="attraction"
            name="attraction"
            type="text"
            value={attraction}
            onChange={(e) => setAttraction(e.target.value)}
            className="w-full rounded-xl border-2 border-brand-tan/60 bg-white px-4 py-3 text-brand-green placeholder:text-brand-muted focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            placeholder="Fairytale Farm"
            required
            disabled={status === "submitting"}
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-brand-green">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border-2 border-brand-tan/60 bg-white px-4 py-3 text-brand-green placeholder:text-brand-muted focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
          placeholder="you@example.com"
          required
          disabled={status === "submitting"}
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-brand-green">
          Tell us about your attraction (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border-2 border-brand-tan/60 bg-white px-4 py-3 text-brand-green placeholder:text-brand-muted focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
          placeholder="What kind of visitors do you get, and what would you love a quest to achieve?"
          disabled={status === "submitting"}
        />
      </div>

      {errorMessage && <p className="text-sm text-brand-coral">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full justify-center rounded-full bg-brand-coral px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#c9432f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Become a Quest Partner"}
      </button>
    </form>
  );
}
