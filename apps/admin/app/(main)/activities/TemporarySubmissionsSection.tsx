"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { TemporarySubmissionModal } from "./TemporarySubmissionModal";
import {
  deleteTemporarySubmission,
  type TeamOption,
  type TemporarySubmissionItem,
} from "./temporary-submissions-actions";

type Props = {
  activityId: number;
  initialSubmissions: TemporarySubmissionItem[];
  teams: TeamOption[];
};

function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TemporarySubmissionsSection({
  activityId,
  initialSubmissions,
  teams,
}: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TemporarySubmissionItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = useCallback(() => {
    setEditing(null);
    setError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: TemporarySubmissionItem) => {
    setEditing(item);
    setError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    router.refresh();
  }, [router]);

  function handleDelete(item: TemporarySubmissionItem) {
    if (
      !window.confirm(
        `Delete temporary submission for “${item.display_name}”? This also removes its team XP credit.`
      )
    ) {
      return;
    }
    setError(null);
    setDeletingId(item.id);
    startTransition(async () => {
      const result = await deleteTemporarySubmission(activityId, item.id);
      setDeletingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-10 rounded-xl border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Temporary submissions
          </h2>
          <p className="mt-1 max-w-xl text-sm text-stone-500">
            Seed photos for this mission so Inspiration galleries, “From around
            the club”, and team Social don’t look empty before real explorers
            submit.
          </p>
        </div>
        <Button type="button" size="md" onClick={openCreate}>
          Add submission
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {initialSubmissions.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">
          No temporary submissions yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {initialSubmissions.map((item) => {
            const thumb = item.photos[0]?.photo_url;
            const busy = isPending && deletingId === item.id;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-900">
                    {item.display_name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {item.team_name ?? "Team"} · {formatSubmittedAt(item.submitted_at)} ·{" "}
                    {item.photos.length} photo
                    {item.photos.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => handleDelete(item)}
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TemporarySubmissionModal
        open={modalOpen}
        onClose={closeModal}
        activityId={activityId}
        teams={teams}
        editing={editing}
      />
    </section>
  );
}
