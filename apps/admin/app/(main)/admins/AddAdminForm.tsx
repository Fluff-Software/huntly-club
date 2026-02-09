"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { addAdminByEmail, type AddAdminState } from "./actions";

export function AddAdminForm() {
  const [state, formAction] = useActionState(
    (prev: AddAdminState, formData: FormData) => addAdminByEmail(prev, formData),
    { error: undefined }
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="admin-email" className="sr-only">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          placeholder="admin@example.com"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage sm:max-w-xs"
        />
      </div>
      <Button type="submit" size="md">
        Add admin
      </Button>
      {state?.error && (
        <div
          className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      )}
    </form>
  );
}
