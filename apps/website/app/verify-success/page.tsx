export const metadata = {
  title: "Email verified · Huntly World",
};

export default function VerifySuccessPage() {
  return (
    <div className="section flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md text-center">
        <h1 className="mb-3 font-display text-2xl font-semibold text-huntly-forest">
          Email verified
        </h1>
        <p className="text-sm leading-relaxed text-huntly-slate">
          Success! Your email has been verified.
          <br />
          Please return to the app to continue your adventure.
        </p>
      </div>
    </div>
  );
}

