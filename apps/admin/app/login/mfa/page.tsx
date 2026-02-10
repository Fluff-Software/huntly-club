\"use client\";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/Button";

type MfaFactor = {
  id: string;
  factorType: "totp" | "phone";
  status: "unverified" | "verified";
};

export default function LoginMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [factor, setFactor] = useState<MfaFactor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialise() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: listError } = await supabase.auth.mfa.listFactors();

      if (listError) {
        // Log for debugging, but keep user-facing message generic.
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

      if (!totpFactor) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setFactor(totpFactor);
      setLoading(false);
    }

    void initialise();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factor || submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();

      const {
        data: challengeData,
        error: challengeError,
      } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

      if (challengeError || !challengeData) {
        console.error("Failed to start MFA challenge", challengeError);
        setError("Could not start verification. Please try again.");
        return;
      }

      const {
        error: verifyError,
      } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        // The response shape is not fully typed here, so we use a minimal cast.
        challengeId: (challengeData as { id: string }).id,
        code,
      });

      if (verifyError) {
        console.error("MFA verification failed", verifyError);
        setError("That code did not work. Please check and try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-700 shadow-sm">
          Checking your security settings…
        </div>
      </div>
    );
  }

  if (!factor) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">
          Two-factor authentication
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Enter the 6-digit code from your authenticator app to finish signing
          in.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="code"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Authentication code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\\D/g, ""))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
            />
            <p className="mt-1 text-xs text-stone-500">
              If you cannot access your authenticator app, contact the team to
              regain access.
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || code.length === 0}
          >
            {submitting ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

