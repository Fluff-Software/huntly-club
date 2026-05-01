"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

type BadgeOption = { id: number; name: string };
type ProfileOption = { id: number; name: string; nickname: string | null };

type ManualAssignmentFormProps = {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  badges: BadgeOption[];
  profiles: ProfileOption[];
};

export function ManualAssignmentForm({
  action,
  badges,
  profiles,
}: ManualAssignmentFormProps) {
  const [state, formAction] = useActionState(
    async (
      _prev: { error?: string; success?: boolean },
      formData: FormData
    ) => action(formData),
    { error: undefined, success: false }
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  return (
    <form
      action={formAction}
      className="mt-4 grid gap-3 md:grid-cols-2"
      onSubmit={() => setHasAttemptedSubmit(true)}
    >
      <select
        name="badge_id"
        required
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
      >
        <option value="">Select badge</option>
        {badges.map((badge) => (
          <option key={badge.id} value={badge.id}>
            {badge.name}
          </option>
        ))}
      </select>
      <select
        name="profile_id"
        required
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
      >
        <option value="">Select user profile</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.nickname || profile.name} (#{profile.id})
          </option>
        ))}
      </select>
      <input
        name="grant_reason"
        placeholder="Reason (optional)"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm md:col-span-2"
      />
      <AssignBadgeSubmitButton />

      {state?.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 md:col-span-2"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      {hasAttemptedSubmit && state?.success && !state?.error ? (
        <div className="text-sm text-green-700 md:col-span-2" role="status">
          Badge assigned successfully.
        </div>
      ) : null}
    </form>
  );
}

function AssignBadgeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white disabled:opacity-70 md:col-span-2"
    >
      {pending ? "Assigning badge..." : "Assign badge"}
    </button>
  );
}
