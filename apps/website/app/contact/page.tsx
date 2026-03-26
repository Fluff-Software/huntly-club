import Link from "next/link";

export const metadata = {
  title: "Get in touch · Huntly World",
};

export default function ContactPage() {
  return (
    <>
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Get in touch
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              We&apos;d love to hear from families, schools, clubs and young
              explorers - whether you&apos;re a parent, educator, or organisation
              interested in bringing Huntly World to your community.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-8">
        <div className="card space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">
              Email
            </h2>
            <p className="text-sm text-huntly-slate">
              Send us a note at{" "}
              <a
                href="mailto:huntly@fluff.software"
                className="font-medium text-huntly-moss underline-offset-2 hover:underline"
              >
                huntly@fluff.software
              </a>{" "}
              and we&apos;ll get back to you as soon as we can.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">
              Partnership & schools
            </h2>
            <p className="text-sm text-huntly-slate">
              We&apos;re especially excited to partner with schools, clubs and
              organisations who want to get children outside, noticing nature
              and building language in a playful way.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">
              Feedback from families
            </h2>
              <p className="text-sm text-huntly-slate">
              Already using Huntly World? We&apos;d love to hear what your child
              enjoys, and where we can make the experience even better.
            </p>
          </div>
        </div>

        <p className="text-xs text-huntly-slate">
          You can also learn more about the original Huntly app on{" "}
          <Link
            href="https://www.huntly.app/"
            className="font-medium text-huntly-moss underline-offset-2 hover:underline"
          >
            our main website
          </Link>
          .
        </p>
        </div>
      </div>
    </>
  );
}

