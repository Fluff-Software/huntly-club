"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { approveRemovalRequest, denyRemovalRequest } from "./actions";

type Props = { requestId: number };

export function ApproveDenyButtons({ requestId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (
      !confirm(
        "Approve this request? All user data (except payment/subscription) will be deleted and their email will be set to (REMOVED)."
      )
    )
      return;
    setError(null);
    setLoading("approve");
    const result = await approveRemovalRequest(requestId);
    setLoading(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleDeny() {
    if (!confirm("Deny this account removal request?")) return;
    setError(null);
    setLoading("deny");
    const result = await denyRemovalRequest(requestId);
    setLoading(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleApprove}
          disabled={loading !== null}
        >
          {loading === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleDeny}
          disabled={loading !== null}
        >
          {loading === "deny" ? "Denying…" : "Deny"}
        </Button>
      </div>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
