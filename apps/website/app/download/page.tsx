import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download Huntly World — Adventure App for Children",
  description:
    "Download Huntly World on the App Store or Google Play. An outdoor adventure club app for children aged 4-14 — weekly missions, story-driven seasons, and team challenges.",
  openGraph: {
    title: "Download Huntly World — Adventure App for Children",
    description:
      "Download Huntly World on the App Store or Google Play. An outdoor adventure club app for children aged 4-14 — weekly missions, story-driven seasons, and team challenges.",
  },
  alternates: {
    canonical: "https://huntly.world/download",
  },
};

export default function WaitlistPage() {
  return (
    <div className="flex min-h-[70vh] items-center bg-gradient-to-b from-huntly-stone/20 to-huntly-parchment py-10 sm:py-12">
      <div className="section">
        <div className="mx-auto max-w-2xl rounded-3xl border border-huntly-stone/70 bg-white/90 p-7 shadow-soft sm:p-10">
          <div className="space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Join the club
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              Huntly World is available on the App Store and Google Play. Download the app to join the club and start exploring.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="https://apps.apple.com/us/app/huntly-world/id6745152309" className="btn-primary">
                Download on the App Store
              </Link>
              <Link href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub" className="btn-primary">
                Download on the Google Play
              </Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-huntly-slate">
            We&apos;ll only use your email to keep you updated about Huntly World and
            won&apos;t share it with anyone else.
          </p>
        </div>
      </div>
    </div>
  );
}

