"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  getUserDetails,
  getUserProfiles,
  getUserImages,
  verifyUserEmail,
  type UserDetailsResult,
  type UserProfilesResult,
  type UserImagesResult,
  type ProfileWithTeam,
  type UserImageRow,
} from "./actions";

const MODAL_TABS = [
  { value: "details", label: "Details" },
  { value: "profiles", label: "Profiles" },
  { value: "images", label: "Images" },
] as const;

type Props = {
  userId: string | null;
  open: boolean;
  onClose: () => void;
};

export function UserDetailModal({ userId, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof MODAL_TABS)[number]["value"]>("details");
  const [details, setDetails] = useState<UserDetailsResult | null>(null);
  const [profiles, setProfiles] = useState<UserProfilesResult | null>(null);
  const [images, setImages] = useState<UserImagesResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setActiveTab("details");
    setDetails(null);
    setProfiles(null);
    setImages(null);
    setLoading(true);
    Promise.all([
      getUserDetails(userId),
      getUserProfiles(userId),
      getUserImages(userId),
    ]).then(([d, p, i]) => {
      setDetails(d);
      setProfiles(p);
      setImages(i);
      setLoading(false);
    });
  }, [open, userId]);

  const handleDetailsRefresh = () => {
    if (userId) {
      getUserDetails(userId).then(setDetails);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="user-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 id="user-detail-title" className="text-lg font-semibold text-stone-900">
            User details
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

        <nav className="border-b border-stone-200 px-6" aria-label="User detail tabs">
          <ul className="flex gap-1">
            {MODAL_TABS.map((t) => (
              <li key={t.value}>
                <button
                  type="button"
                  onClick={() => setActiveTab(t.value)}
                  className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 ${
                    activeTab === t.value
                      ? "border-huntly-forest text-huntly-forest"
                      : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                  }`}
                  aria-current={activeTab === t.value ? true : undefined}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-sm text-stone-500">Loading…</p>
          )}

          {!loading && activeTab === "details" && (
            <DetailsTab result={details} onDetailsRefresh={handleDetailsRefresh} />
          )}
          {!loading && activeTab === "profiles" && (
            <ProfilesTab result={profiles} />
          )}
          {!loading && activeTab === "images" && (
            <ImagesTab result={images} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsTab({ result, onDetailsRefresh }: { result: UserDetailsResult | null; onDetailsRefresh: () => void }) {
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!result) return null;
  if (result.error) {
    return <p className="text-sm text-red-600">{result.error}</p>;
  }
  const u = result.user;
  if (!u) return null;

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMessage(null);
    const res = await verifyUserEmail(u.id);
    setVerifying(false);
    if (res.error) {
      setVerifyMessage({ type: "error", text: res.error });
    } else {
      setVerifyMessage({ type: "success", text: "Email successfully verified." });
      onDetailsRefresh();
    }
  };

  return (
    <dl className="space-y-3 text-sm">
      <Row label="User ID" value={u.id} className="break-all" />
      <Row label="Email" value={u.email ?? "—"} />
      <Row label="Team" value={result.teamName ?? "—"} />
      <Row label="Created at" value={formatDate(u.created_at)} />
      <Row label="Email confirmed at" value={formatDate(u.email_confirmed_at)} />
      <Row label="Last sign in" value={formatDate(u.last_sign_in_at)} />
      <Row label="Updated at" value={formatDate(u.updated_at)} />

      {!u.email_confirmed_at && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="w-fit rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-forest/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
          >
            {verifying ? "Verifying…" : "Verify email"}
          </button>
          {verifyMessage && (
            <p className={`text-sm ${verifyMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {verifyMessage.text}
            </p>
          )}
        </div>
      )}

      {u.raw_app_meta_data && Object.keys(u.raw_app_meta_data).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">App metadata</div>
          <div className="space-y-1 pl-4">
            {Object.entries(u.raw_app_meta_data).map(([key, val]) => (
              <LabelValue
                key={key}
                label={formatMetadataKey(key)}
                value={formatMetadataValue(val)}
                className="break-all"
              />
            ))}
          </div>
        </div>
      )}
      {u.raw_user_meta_data && Object.keys(u.raw_user_meta_data).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">User metadata</div>
          <div className="space-y-1 pl-4">
            {Object.entries(u.raw_user_meta_data).map(([key, val]) => (
              <LabelValue
                key={key}
                label={formatMetadataKey(key)}
                value={formatMetadataValue(val)}
                className="break-all"
              />
            ))}
          </div>
        </div>
      )}
    </dl>
  );
}

function formatMetadataKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetadataValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.map(String).join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function ProfilesTab({ result }: { result: UserProfilesResult | null }) {
  if (!result) return null;
  if (result.error) {
    return <p className="text-sm text-red-600">{result.error}</p>;
  }
  const list = result.profiles ?? [];
  if (list.length === 0) {
    return <p className="text-sm text-stone-500">No profiles.</p>;
  }

  return (
    <div className="space-y-6">
      {list.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  );
}

function ProfileCard({ profile }: { profile: ProfileWithTeam }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Profile #{profile.id}
      </h3>
      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        <Row label="Name" value={profile.name} />
        <Row label="Nickname" value={profile.nickname ?? "—"} />
        <Row label="Colour" value={profile.colour} />
        <Row label="XP" value={String(profile.total_achievement_xp)} />
        <Row label="Created at" value={new Date(profile.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} />
      </dl>
    </section>
  );
}

function ImagesTab({ result }: { result: UserImagesResult | null }) {
  if (!result) return null;
  if (result.error) {
    return <p className="text-sm text-red-600">{result.error}</p>;
  }
  const list = result.images ?? [];
  if (list.length === 0) {
    return <p className="text-sm text-stone-500">No images uploaded.</p>;
  }

  const statusLabel: Record<number, string> = {
    0: "For review",
    1: "Approved",
    2: "Denied",
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {list.map((img) => (
        <ImageCard key={img.photo_id} image={img} statusLabel={statusLabel} />
      ))}
    </div>
  );
}

function ImageCard({
  image,
  statusLabel,
}: {
  image: UserImageRow;
  statusLabel: Record<number, string>;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-stone-100">
        <Image
          src={image.photo_url}
          alt="Uploaded by profile"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="object-cover"
        />
      </div>
      <figcaption className="border-t border-stone-100 px-3 py-2 text-xs text-stone-600">
        <p className="font-medium text-stone-800">
          {image.profiles?.nickname ?? image.profiles?.name ?? `Profile #${image.profile_id}`}
        </p>
        <p className="mt-0.5 text-stone-500">
          {image.activities?.title ?? image.activities?.name ?? "—"}
        </p>
        <p className="mt-0.5 text-stone-500">
          {new Date(image.uploaded_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
          {" · "}
          {statusLabel[image.status] ?? String(image.status)}
        </p>
      </figcaption>
    </figure>
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

function LabelValue({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="shrink-0 font-medium text-stone-500">{label}:</span>
      <span className={className}>{value}</span>
    </div>
  );
}
