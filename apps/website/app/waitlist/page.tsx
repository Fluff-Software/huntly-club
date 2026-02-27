import WaitlistForm from "./waitlist-form";

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
              Join the waitlist
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              Huntly World is getting ready for more explorers. Leave your details and
              we&apos;ll let you know as soon as we&apos;re ready for new families,
              schools or clubs.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="card">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-xs text-huntly-slate">
            We&apos;ll only use your email to keep you updated about Huntly World and
            won&apos;t share it with anyone else.
          </p>
        </div>
      </div>
    </>
  );
}

