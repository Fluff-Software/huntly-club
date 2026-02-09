"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { removeAdmin } from "./actions";

type Props = { userId: string };

export function RemoveAdminButton({ userId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this admin? They will no longer be able to sign in.")) return;
    setError(null);
    setLoading(true);
    const result = await removeAdmin(userId);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={handleRemove}
        disabled={loading}
      >
        {loading ? "Removing…" : "Remove"}
      </Button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
