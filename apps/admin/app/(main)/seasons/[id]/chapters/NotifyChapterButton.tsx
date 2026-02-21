"use client";

import { useState } from "react";
import { sendChapterPushNotification } from "./actions";
import { Button } from "@/components/Button";

type Props = { chapterId: number; chapterTitle: string };

export function NotifyChapterButton({ chapterId, chapterTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await sendChapterPushNotification(chapterId);
      if (result.error) {
        setMessage(`Failed: ${result.error}`);
      } else {
        const n = result.count ?? 0;
        setMessage(`Notification sent to ${n} user${n === 1 ? "" : "s"}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Sending…" : "Notify users"}
      </Button>
      {message ? (
        <span
          className={`text-sm ${message.startsWith("Failed") ? "text-red-600" : "text-stone-500"}`}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
