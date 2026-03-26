"use client";

import { useState } from "react";
import { sendChapterEmailNotification, sendChapterPushNotification } from "./actions";
import { Button } from "@/components/Button";

type Props = { chapterId: number; chapterTitle: string };

export function NotifyChapterButton({ chapterId, chapterTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const [pushResult, emailResult] = await Promise.all([
        sendChapterPushNotification(chapterId),
        sendChapterEmailNotification(chapterId),
      ]);

      if (pushResult.error && emailResult.error) {
        setMessage(`Failed push and email notifications.`);
      } else if (pushResult.error) {
        const emailCount = emailResult.count ?? 0;
        setMessage(
          `Push failed. Email sent to ${emailCount} user${emailCount === 1 ? "" : "s"}.`
        );
      } else if (emailResult.error) {
        const pushCount = pushResult.count ?? 0;
        setMessage(
          `Push sent to ${pushCount} user${pushCount === 1 ? "" : "s"}, but email failed.`
        );
      } else {
        const pushCount = pushResult.count ?? 0;
        const emailCount = emailResult.count ?? 0;
        setMessage(
          `Push sent to ${pushCount} user${pushCount === 1 ? "" : "s"}. Email sent to ${emailCount} user${emailCount === 1 ? "" : "s"}.`
        );
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
