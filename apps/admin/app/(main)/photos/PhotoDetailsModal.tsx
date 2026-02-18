"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPhotoDetails,
  denyPhoto,
  moveToForReview,
  deletePhoto,
  type PhotoDetailsResult,
} from "./actions";
import { FullPhotoModal } from "./FullPhotoModal";
import { ConfirmModal } from "./ConfirmModal";
import { DenyReasonModal } from "./DenyReasonModal";

const STATUS_LABELS: Record<number, string> = {
  0: "For review",
  1: "Approved",
  2: "Denied",
};

const STATUS_APPROVED = 1;
const STATUS_DENIED = 2;

type Props = {
  photoId: number;
  photoUrl: string;
  open: boolean;
  onClose: () => void;
};

export function PhotoDetailsModal({
  photoId,
  photoUrl,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<PhotoDetailsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [fullPhotoOpen, setFullPhotoOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [denyReasonOpen, setDenyReasonOpen] = useState(false);

  useEffect(() => {
    if (!open || !photoId) return;
    setLoading(true);
    setData(null);
    getPhotoDetails(photoId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [open, photoId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const displayPhotoUrl = data?.photo?.photo_url ?? photoUrl;

  return (
    <>
      <FullPhotoModal
        photoUrl={displayPhotoUrl}
        open={fullPhotoOpen}
        onClose={() => setFullPhotoOpen(false)}
      />
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          setActionPending(true);
          const result = await deletePhoto({}, photoId);
          setActionPending(false);
          if (!result.error) {
            onClose();
            router.refresh();
          }
        }}
        title="Are you sure?"
        message="This photo will be permanently deleted from the database and storage."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        pending={actionPending}
      />
      <DenyReasonModal
        open={denyReasonOpen}
        onClose={() => setDenyReasonOpen(false)}
        onConfirm={async (reason) => {
          setDenyReasonOpen(false);
          setActionPending(true);
          const result = await denyPhoto({}, photoId, reason || undefined);
          setActionPending(false);
          if (!result.error) {
            onClose();
            router.refresh();
          }
        }}
        pending={actionPending}
      />
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="photo-details-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setFullPhotoOpen(true)}
          className="relative flex min-h-0 w-1/2 shrink-0 cursor-pointer items-center justify-center bg-stone-100 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-inset"
          aria-label="View full photo"
        >
          <Image
            src={photoUrl}
            alt="Photo"
            width={600}
            height={800}
            className="max-h-[90vh] w-auto object-contain"
          />
        </button>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="photo-details-title" className="text-lg font-semibold text-stone-900">
              Photo
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-huntly-sage"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading && !data?.error && (
            <p className="text-sm text-stone-500">Loading…</p>
          )}

          {data?.error && (
            <p className="text-sm text-red-600">{data.error}</p>
          )}

          {!loading && data && !data.error && (
            <div className="space-y-6">
              <DetailsSection title="Photo">
                {data.photo && (
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Uploaded" value={new Date(data.photo.uploaded_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} />
                    <Row label="Status" value={STATUS_LABELS[data.photo.status] ?? String(data.photo.status)} />
                    {data.photo.status === STATUS_DENIED && data.photo.reason != null && data.photo.reason !== "" && (
                      <Row label="Denial reason" value={data.photo.reason} className="whitespace-pre-wrap" />
                    )}
                  </dl>
                )}
              </DetailsSection>

              <DetailsSection title="Profile">
                {data.profile ? (
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Name" value={data.profile.name} />
                    <Row label="Nickname" value={data.profile.nickname ?? "—"} />
                  </dl>
                ) : (
                  <p className="text-sm text-stone-500">—</p>
                )}
              </DetailsSection>

              <DetailsSection title="User">
                {data.user?.email != null ? (
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Email" value={data.user.email} />
                  </dl>
                ) : (
                  <p className="text-sm text-stone-500">—</p>
                )}
              </DetailsSection>

              <DetailsSection title="Mission">
                {data.activity ? (
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Title" value={data.activity.title} />
                    <Row label="Description" value={data.activity.description ?? "—"} className="whitespace-pre-wrap" />
                  </dl>
                ) : (
                  <p className="text-sm text-stone-500">—</p>
                )}
              </DetailsSection>

              {data.photo && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-200 pt-4">
                  {data.photo.status === STATUS_APPROVED && (
                    <>
                      <button
                        type="button"
                        disabled={actionPending}
                        onClick={() => setDenyReasonOpen(true)}
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
                      >
                        Deny
                      </button>
                      <button
                        type="button"
                        disabled={actionPending}
                        onClick={async () => {
                          setActionPending(true);
                          const result = await moveToForReview({}, photoId);
                          setActionPending(false);
                          if (!result.error) {
                            onClose();
                            router.refresh();
                          }
                        }}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 disabled:opacity-50"
                      >
                        For Review
                      </button>
                    </>
                  )}
                  {data.photo.status === STATUS_DENIED && (
                    <>
                      <button
                        type="button"
                        disabled={actionPending}
                        onClick={async () => {
                          setActionPending(true);
                          const result = await moveToForReview({}, photoId);
                          setActionPending(false);
                          if (!result.error) {
                            onClose();
                            router.refresh();
                          }
                        }}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 disabled:opacity-50"
                      >
                        For Review
                      </button>
                      <button
                        type="button"
                        disabled={actionPending}
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
    </>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-medium text-stone-500">{label}:</dt>
      <dd className={className}>{value}</dd>
    </div>
  );
}
