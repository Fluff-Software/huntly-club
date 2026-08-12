import type { Metadata } from "next";
import FeedbackForm from "./feedback-form";

export const metadata: Metadata = {
  title: "Leave feedback · Huntly",
  description: "Share your thoughts, experiences and ideas about Huntly or Huntly World with our team.",
  alternates: {
    canonical: "https://huntly.world/feedback",
  },
};

export default function FeedbackPage() {
  return (
    <>
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Leave us feedback
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              Huntly has been created to bring everyone a great experience.
              We&apos;d love to hear your thoughts, experiences, and ideas —
              whether you use Huntly or Huntly World.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="card">
            <FeedbackForm />
          </div>

          <p className="text-xs text-huntly-slate">
            You can also email us directly at{" "}
            <a
              href="mailto:huntly@fluff.software"
              className="font-medium text-huntly-moss underline-offset-2 hover:underline"
            >
              huntly@fluff.software
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
