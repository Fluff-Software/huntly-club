"use client";

import { useTransition } from "react";
import { Button } from "@/components/Button";
import { deleteActivity } from "./actions";

export function DeleteMissionButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "Delete this mission? This will permanently remove all submissions and progress. This cannot be undone."
      )
    )
      return;
    startTransition(() => deleteActivity(id));
  }

  return (
    <Button variant="danger" size="md" onClick={handleClick} disabled={pending}>
      {pending ? "Deleting…" : "Delete mission"}
    </Button>
  );
}
