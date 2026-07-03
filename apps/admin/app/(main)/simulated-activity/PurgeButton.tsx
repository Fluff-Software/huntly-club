"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { purgeSimulatedActivity } from "./actions";

export function PurgeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await purgeSimulatedActivity();
    setPending(false);
    setOpen(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Purge simulated activity
      </Button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Purge simulated activity"
        message="This deletes all simulated completions, photos and team points. The fake explorer pool itself is kept, so the drip can start fresh."
        confirmLabel="Purge"
        variant="danger"
        pending={pending}
      />
    </div>
  );
}
