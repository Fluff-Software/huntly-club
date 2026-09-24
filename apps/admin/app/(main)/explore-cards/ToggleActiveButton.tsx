"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { setExploreCardActive } from "./actions";

type Props = {
  id: string;
  name: string;
  isActive: boolean;
};

export function ToggleActiveButton({ id, name, isActive }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await setExploreCardActive(id, !isActive);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <ConfirmModal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={confirm}
        pending={pending}
        variant={isActive ? "danger" : "default"}
        title={isActive ? "Deactivate card?" : "Activate card?"}
        message={
          isActive
            ? `“${name}” will stop appearing in the binder catalogue and won’t be awarded at new claims.`
            : `“${name}” will be available in the binder catalogue and award pool again.`
        }
        confirmLabel={isActive ? "Deactivate" : "Activate"}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
