"use client";

import { useEffect } from "react";
import { Button } from "@/components/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8">
      <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-800">
        {error.message || "An unexpected error occurred."}
      </p>
      <p className="mt-4">
        <Button type="button" onClick={reset} variant="secondary" size="md">
          Try again
        </Button>
      </p>
    </div>
  );
}
