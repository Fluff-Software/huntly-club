import Link from "next/link";

export const metadata = {
  title: "Join the waitlist · Huntly World",
};

export default function WaitlistPage() {
  return (
    <>
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Join the club
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              Huntly World is available on the App Store and Google Play. Download the app to join the club and start exploring.
            </p>
            <div className="mt-6 flex flex-col gap-2 items-start">
              <Link href="https://apps.apple.com/us/app/huntly-world/id6745152309" className="btn-primary">
                Download on the App Store
              </Link>
              <Link href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub" className="btn-primary">
                Download on the Google Play
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <p className="mt-4 text-xs text-huntly-slate">
            We&apos;ll only use your email to keep you updated about Huntly World and
            won&apos;t share it with anyone else.
          </p>
        </div>
      </div>
    </>
  );
}

