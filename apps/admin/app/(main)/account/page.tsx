"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/Button";

type MfaFactor = {
  id: string;
  factorType: "totp" | "phone";
  status: "unverified" | "verified";
};

type TotpEnrollment = {
  id: string;
  type: "totp";
  totp?: {
    qr_code?: string;
    secret?: string;
  };
};

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<MfaFactor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [enrolment, setEnrolment] = useState<TotpEnrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await refreshFactors(supabase);
    }

    async function refreshFactors(supabase: ReturnType<typeof createClient>) {
      setLoading(true);
      setError(null);

      const { data, error: listError } = await supabase.auth.mfa.listFactors();

      if (listError) {
        console.error("Failed to load MFA factors", listError);
        setError("Unable to load security settings. Please try again.");
        setLoading(false);
        return;
      }

      const factors = (data?.factors as MfaFactor[] | undefined) ?? [];
      const totpFactor =
        factors.find(
          (f) => f.factorType === "totp" && f.status === "verified",
        ) ?? factors.find((f) => f.factorType === "totp");

      setFactor(totpFactor ?? null);
      setLoading(false);
    }

    void load();
  }, [router]);

  async function handleStartEnrolment() {
    if (isEnrolling || enrolment) return;

    setError(null);
    setIsEnrolling(true);

    try {
      const supabase = createClient();

      const {
        data,
        error: enrolError,
      } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (enrolError || !data) {
        console.error("Failed to start MFA enrolment", enrolError);
        setError("Could not start two-factor enrolment. Please try again.");
        return;
      }

      setEnrolment(data as TotpEnrollment);
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleVerifyEnrolment(e: React.FormEvent) {
    e.preventDefault();

    if (!enrolment || isVerifying) return;

    setError(null);
    setIsVerifying(true);

    try {
      const supabase = createClient();

      const {
        data: challengeData,
        error: challengeError,
      } = await supabase.auth.mfa.challenge({
        factorId: enrolment.id,
      });

      if (challengeError || !challengeData) {
        console.error("Failed to start MFA challenge", challengeError);
        setError("Could not start verification. Please try again.");
        return;
      }

      const {
        error: verifyError,
      } = await supabase.auth.mfa.verify({
        factorId: enrolment.id,
        challengeId: (challengeData as { id: string }).id,
        code: verificationCode,
      });

      if (verifyError) {
        console.error("MFA enrolment verification failed", verifyError);
        setError("That code did not work. Please check and try again.");
        return;
      }

      // Clear enrolment UI and refresh state.
      setEnrolment(null);
      setVerificationCode("");

      const supabaseAfter = createClient();
      const {
        data: { user },
      } = await supabaseAfter.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: listError } =
        await supabaseAfter.auth.mfa.listFactors();

      if (listError) {
        console.error("Failed to reload MFA factors", listError);
        setError("Two-factor was enabled, but we could not refresh the view.");
        return;
      }

      const factors = (data?.factors as MfaFactor[] | undefined) ?? [];
      const totpFactor =
        factors.find(
          (f) => f.factorType === "totp" && f.status === "verified",
        ) ?? factors.find((f) => f.factorType === "totp");

      setFactor(totpFactor ?? null);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleDisable() {
    if (!factor || isDisabling) return;

    setError(null);
    setIsDisabling(true);

    try {
      const supabase = createClient();

      const { error: unenrolError } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (unenrolError) {
        console.error("Failed to disable MFA", unenrolError);
        setError("Could not disable two-factor authentication. Please try again.");
        return;
      }

      setFactor(null);
    } finally {
      setIsDisabling(false);
    }
  }

  const hasTotp = !!factor;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Account
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your sign-in security for the admin area.
          </p>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                Two-factor authentication
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Add an extra layer of protection to your admin account by
                requiring a code from an authenticator app when you sign in.
              </p>
            </div>
            <div className="mt-3 flex items-center sm:mt-0">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  hasTotp
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-stone-50 text-stone-700 ring-1 ring-stone-200"
                }`}
              >
                {hasTotp ? "Enabled" : "Not set up"}
              </span>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-stone-500">
              Checking your security settings…
            </p>
          ) : (
            <>
              {error && (
                <div
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!hasTotp && !enrolment && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-stone-600">
                    We strongly recommend enabling two-factor authentication for
                    admin accounts.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartEnrolment}
                    disabled={isEnrolling}
                  >
                    {isEnrolling ? "Starting…" : "Set up two-factor"}
                  </Button>
                </div>
              )}

              {enrolment && (
                <form
                  onSubmit={handleVerifyEnrolment}
                  className="mt-4 space-y-4"
                >
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm font-medium text-stone-800">
                      1. Scan the QR code
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      Use your preferred authenticator app (for example,
                      1Password, Google Authenticator, or Apple Keychain) to
                      scan this code.
                    </p>
                    {enrolment.totp?.qr_code ? (
                      <div className="mt-4 flex justify-center">
                        {/* The QR code is provided as a data URL by Supabase. */}
                        <img
                          src={enrolment.totp.qr_code}
                          alt="QR code to set up two-factor authentication"
                          className="h-40 w-40 rounded-lg border border-stone-200 bg-white"
                        />
                      </div>
                    ) : null}
                    {enrolment.totp?.secret && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-stone-800">
                          Or enter this key manually
                        </p>
                        <p className="mt-1 select-all rounded-md bg-white px-2 py-1 font-mono text-xs tracking-wide text-stone-800 ring-1 ring-stone-200">
                          {enrolment.totp.secret}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-800">
                      2. Confirm with a code
                    </p>
                    <p className="text-xs text-stone-600">
                      Enter the 6-digit code from your authenticator app to
                      finish enabling two-factor authentication.
                    </p>
                    <input
                      id="verification-code"
                      name="verification-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isVerifying || verificationCode.length === 0}
                    >
                      {isVerifying ? "Verifying…" : "Enable two-factor"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEnrolment(null);
                        setVerificationCode("");
                      }}
                      disabled={isVerifying}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {hasTotp && !enrolment && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-stone-600">
                    Two-factor authentication is active for your admin account.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleDisable}
                    disabled={isDisabling}
                  >
                    {isDisabling ? "Disabling…" : "Disable two-factor"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

