export const metadata = {
  title: "Support · Huntly World",
};

export default function SupportPage() {
  return (
    <>
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Support
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              Need help with Huntly World? We&apos;re here for you.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="card space-y-5">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">
                Get help
              </h2>
              <p className="text-sm text-huntly-slate">
                For any questions, issues or feedback, send us an email at{" "}
                <a
                  href="mailto:huntly@fluff.software"
                  className="font-medium text-huntly-moss underline-offset-2 hover:underline"
                >
                  huntly@fluff.software
                </a>{" "}
                and we&apos;ll get back to you as soon as we can.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
