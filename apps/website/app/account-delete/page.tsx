import AccountDeleteForm from "./account-delete-form";

export const metadata = {
  title: "Request account deletion · Huntly World",
};

export default function AccountDeletePage() {
  return (
    <>
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Request account deletion
            </h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              We&apos;re sorry to see you go. You can also request account
              removal from the Settings screen inside the Huntly World app.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="card space-y-5">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">
                What happens when your account is deleted
              </h2>
              <ul className="list-disc pl-5 text-sm leading-relaxed text-huntly-slate">
                <li>
                  All your data will be permanently deleted, including your
                  profile(s), progress, achievements, and any uploaded content.
                </li>
                <li>This action cannot be undone once the request is approved.</li>
                <li>
                  You can cancel your removal request within 24 hours of
                  submitting it from the Settings screen in the app.
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <AccountDeleteForm />
          </div>

          <p className="text-xs text-huntly-slate">
            If you have any questions, contact us at{" "}
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
