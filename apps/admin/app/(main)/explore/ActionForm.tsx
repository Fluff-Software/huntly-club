"use client";

import { useActionState } from "react";

type ActionResult = { error?: string };

type ActionFormProps = {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  children: React.ReactNode;
};

/** Thin client wrapper so server actions that return {error?} can bind directly to <form action>. */
export function ActionForm({ action, className, children }: ActionFormProps) {
  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => action(formData),
    { error: undefined }
  );

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
