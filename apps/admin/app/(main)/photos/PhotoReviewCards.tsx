"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { approvePhoto, denyPhoto } from "./actions";
import { Button } from "@/components/Button";
import { FullPhotoModal } from "./FullPhotoModal";
import { DenyReasonModal } from "./DenyReasonModal";
import { useSwipe } from "@/hooks/useSwipe";

export type ReviewPhoto = {
  photo_id: number;
  photo_url: string;
  uploaded_at: string;
  activity_id: number | null;
  profile_id: number;
  activities: { title: string | null } | null;
  profiles: { nickname: string | null } | null;
};

type Props = {
  initialPhotos: ReviewPhoto[];
};

const CheckIcon = () => (
  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function PhotoReviewCards({ initialPhotos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState(initialPhotos);
  const [fullPhotoOpen, setFullPhotoOpen] = useState(false);
  const [denyReasonOpen, setDenyReasonOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "deny" | null>(null);

  const current = photos[0];
  const remaining = photos.length;

  // Defined before useSwipe so the hook can reference them as stable callbacks
  const handleApprove = useCallback(() => {
    if (!current || isPending) return;
    setPendingAction("approve");
    startTransition(async () => {
      await approvePhoto({}, current.photo_id);
      setPhotos((prev) => prev.slice(1));
      if (photos.length <= 1) router.refresh();
    });
  }, [current, isPending, photos.length, router, startTransition]);

  const handleDeny = useCallback(() => {
    if (!current || isPending) return;
    setDenyReasonOpen(true);
  }, [current, isPending]);

  const { cardStyle, overlayOpacity, overlayDirection, wasDrag, pointerHandlers } =
    useSwipe({
      onSwipeRight: handleApprove,
      onSwipeLeft: handleDeny,
      disabled: isPending || !current,
    });

  const handleDenyConfirm = (reason: string) => {
    if (!current) return;
    setPendingAction("deny");
    startTransition(async () => {
      await denyPhoto({}, current.photo_id, reason || undefined);
      setDenyReasonOpen(false);
      setPhotos((prev) => prev.slice(1));
      if (photos.length <= 1) router.refresh();
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current || isPending) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDenyReasonOpen(true);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleApprove();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, isPending, handleApprove]);

  if (remaining === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 py-16 text-center">
        <p className="text-lg font-medium text-stone-700">All caught up</p>
        <p className="mt-1 text-sm text-stone-500">No more photos to review.</p>
        <Button href="/photos" variant="secondary" size="md" className="mt-6">
          Back to Photos
        </Button>
      </div>
    );
  }

  return (
    <>
      <FullPhotoModal
        photoUrl={current.photo_url}
        open={fullPhotoOpen}
        onClose={() => setFullPhotoOpen(false)}
      />
      <DenyReasonModal
        open={denyReasonOpen}
        onClose={() => setDenyReasonOpen(false)}
        onConfirm={handleDenyConfirm}
        pending={isPending}
      />
      <div className="mx-auto max-w-lg">
        <p className="mb-4 text-center text-sm text-stone-500">
          {remaining} photo{remaining !== 1 ? "s" : ""} left · Swipe or use arrow keys · ← Deny · Approve →
        </p>

        {/* Swipeable card wrapper */}
        <div
          style={cardStyle}
          {...pointerHandlers}
          className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg"
        >
          {/* Approve overlay (swipe right) */}
          {overlayDirection === "right" && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start rounded-2xl bg-emerald-500/80 p-6"
              style={{ opacity: overlayOpacity }}
              aria-hidden
            >
              <span className="rotate-[-15deg] rounded-xl border-4 border-white px-4 py-2 text-3xl font-extrabold uppercase tracking-widest text-white shadow-lg">
                Approve
              </span>
            </div>
          )}

          {/* Deny overlay (swipe left) */}
          {overlayDirection === "left" && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-2xl bg-red-500/80 p-6"
              style={{ opacity: overlayOpacity }}
              aria-hidden
            >
              <span className="rotate-[15deg] rounded-xl border-4 border-white px-4 py-2 text-3xl font-extrabold uppercase tracking-widest text-white shadow-lg">
                Deny
              </span>
            </div>
          )}

          {/* Loading overlay while server action is in flight */}
          {isPending && (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm" aria-live="polite" aria-label={pendingAction === "approve" ? "Approving photo…" : "Denying photo…"}>
              <svg className="h-10 w-10 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-sm font-medium text-stone-600">
                {pendingAction === "approve" ? "Approving…" : "Denying…"}
              </span>
            </div>
          )}

          {/* Click-to-expand — suppressed if pointer moved (drag vs tap) */}
          <button
            type="button"
            className="absolute inset-0 z-0 h-full w-full"
            onClick={() => { if (!wasDrag()) setFullPhotoOpen(true); }}
            aria-label="View full photo"
          >
            <div className="relative h-full w-full bg-stone-100">
              <Image
                src={current.photo_url}
                alt="Mission submission"
                fill
                sizes="(max-width: 640px) 100vw, 32rem"
                className="pointer-events-none object-contain"
                priority
              />
            </div>
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="font-medium text-white">
              {current.activities?.title ?? "—"}
            </p>
            <time
              dateTime={current.uploaded_at}
              className="mt-0.5 block text-sm text-white/80"
            >
              {new Date(current.uploaded_at).toLocaleString("en-GB", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </time>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={handleDeny}
            disabled={isPending}
            className="flex size-20 items-center justify-center rounded-full border-2 border-red-300 bg-white text-red-600 shadow-md transition hover:border-red-400 hover:bg-red-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Deny photo"
          >
            <XIcon />
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="flex size-20 items-center justify-center rounded-full border-2 border-emerald-300 bg-white text-emerald-600 shadow-md transition hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Approve photo"
          >
            <CheckIcon />
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          ← Deny · Approve → · Click photo to view full size
        </p>
      </div>
    </>
  );
}
