"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { denyPhoto, moveToForReview, deletePhoto } from "./actions";
import { PhotoDetailsModal } from "./PhotoDetailsModal";
import { ConfirmModal } from "./ConfirmModal";
import { DenyReasonModal } from "./DenyReasonModal";

type PhotoRow = {
  photo_id: number;
  photo_url: string;
  uploaded_at: string;
  activity_id: number | null;
  profile_id: number;
  activities: { title: string | null } | null;
  profiles: { nickname: string | null } | null;
};

type Props = {
  photo: PhotoRow;
  variant: "approved" | "denied";
};

const DotsIcon = () => (
  <svg
    className="h-5 w-5"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

export function PhotoCardWithMenu({ photo, variant }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [denyReasonOpen, setDenyReasonOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, [open]);

  async function handleAction(
    action: () => Promise<{ error?: string }>
  ) {
    setOpen(false);
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.error) router.refresh();
  }

  const approvedMenuItems = [
    {
      label: "Deny",
      className: "text-red-600",
      onClick: () => {
        setOpen(false);
        setDenyReasonOpen(true);
      },
    },
    {
      label: "For Review",
      className: "text-stone-700",
      onClick: () => handleAction(() => moveToForReview({}, photo.photo_id)),
    },
  ];

  const deniedMenuItems = [
    {
      label: "For Review",
      className: "text-stone-700",
      onClick: () => handleAction(() => moveToForReview({}, photo.photo_id)),
    },
    {
      label: "Delete",
      className: "text-red-600",
      onClick: () => {
        setOpen(false);
        setDeleteConfirmOpen(true);
      },
    },
  ];

  const items = variant === "approved" ? approvedMenuItems : deniedMenuItems;

  return (
    <>
      <PhotoDetailsModal
        photoId={photo.photo_id}
        photoUrl={photo.photo_url}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          await handleAction(() => deletePhoto({}, photo.photo_id));
        }}
        title="Are you sure?"
        message="This photo will be permanently deleted from the database and storage."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
      {variant === "approved" && (
        <DenyReasonModal
          open={denyReasonOpen}
          onClose={() => setDenyReasonOpen(false)}
          onConfirm={async (reason) => {
            setDenyReasonOpen(false);
            await handleAction(() => denyPhoto({}, photo.photo_id, reason || undefined));
          }}
          pending={pending}
        />
      )}
    <figure className="group relative rounded-xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        className="relative aspect-square cursor-pointer bg-stone-100"
        onClick={() => setDetailsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailsOpen(true);
          }
        }}
        aria-label="View photo details"
      >
        <Image
          src={photo.photo_url}
          alt="Activity submission"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover"
        />
        <div ref={menuRef} className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            disabled={pending}
            className="flex size-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50 disabled:opacity-50"
            aria-label="Photo options"
            aria-expanded={open}
            aria-haspopup="true"
          >
            <DotsIcon />
          </button>
          {open && (
            <div
              className="absolute right-0 top-full z-10 mt-1 min-w-[10rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.onClick();
                  }}
                  className={`w-full px-3 py-2 text-left text-sm ${item.className} hover:bg-stone-100 focus:bg-stone-100 focus:outline-none`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <figcaption
        className="cursor-pointer border-t border-stone-100 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50"
        onClick={() => setDetailsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailsOpen(true);
          }
        }}
      >
        <span className="font-medium text-stone-800 truncate block">
          {photo.activities?.title ?? "—"}
        </span>
        <time
          dateTime={photo.uploaded_at}
          className="mt-0.5 block text-stone-500"
        >
          {new Date(photo.uploaded_at).toLocaleString("en-GB", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </time>
      </figcaption>
    </figure>
    </>
  );
}
