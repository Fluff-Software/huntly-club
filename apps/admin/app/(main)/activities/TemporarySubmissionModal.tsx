"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ImageCropModal } from "@/components/ImageCropModal";
import { PHOTO_REVIEW_ASPECT, imageAspectStyle } from "@/lib/image-aspects";
import { compressImageFileForUpload } from "@/lib/client-image-resize";
import { uploadTemporarySubmissionPhoto } from "@/lib/upload-actions";
import { generateNickname } from "@/lib/nicknameGenerator";
import {
  createTemporarySubmission,
  updateTemporarySubmission,
  type TeamOption,
  type TemporarySubmissionFormState,
  type TemporarySubmissionItem,
} from "./temporary-submissions-actions";

type Props = {
  open: boolean;
  onClose: () => void;
  activityId: number;
  teams: TeamOption[];
  editing: TemporarySubmissionItem | null;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormProps = {
  activityId: number;
  teams: TeamOption[];
  editing: TemporarySubmissionItem | null;
  onClose: () => void;
};

function TemporarySubmissionForm({
  activityId,
  teams,
  editing,
  onClose,
}: FormProps) {
  const [displayName, setDisplayName] = useState(() =>
    editing?.display_name ?? generateNickname()
  );
  const [teamId, setTeamId] = useState(() =>
    editing ? String(editing.team_id) : teams[0] ? String(teams[0].id) : ""
  );
  const [submittedAt, setSubmittedAt] = useState(() =>
    toDatetimeLocalValue(
      editing?.submitted_at ?? new Date().toISOString()
    )
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>(() =>
    editing?.photos.map((p) => p.photo_url) ?? []
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const action = editing
    ? updateTemporarySubmission.bind(null, activityId, editing.id)
    : createTemporarySubmission.bind(null, activityId);

  const [state, formAction, pending] = useActionState<
    TemporarySubmissionFormState,
    FormData
  >(action, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending && !isUploading) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending, isUploading]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError(null);
    setPendingFile(file);
    setCropOpen(true);
  }

  function handleConfirmCrop(croppedFile: File) {
    setCropOpen(false);
    setPendingFile(null);
    startUpload(async () => {
      let fileToUpload = croppedFile;
      try {
        fileToUpload = await compressImageFileForUpload(croppedFile);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to process image");
        return;
      }
      const formData = new FormData();
      formData.set("file", fileToUpload);
      formData.set("activityId", String(activityId));
      const result = await uploadTemporarySubmissionPhoto(formData);
      if (result.error || !result.url) {
        setUploadError(result.error ?? "Upload failed");
        return;
      }
      setPhotoUrls((prev) => [...prev, result.url!]);
    });
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
      onClick={() => {
        if (!pending && !isUploading) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900">
          {editing ? "Edit temporary submission" : "Add temporary submission"}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Seed photos so Inspiration, club feed, and team Social don’t look empty.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700">
              Display name
            </label>
            <div className="mt-1 flex gap-2">
              <input
                name="display_name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
              />
              <button
                type="button"
                onClick={() => setDisplayName(generateNickname())}
                className="shrink-0 rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="temp-submission-team"
              className="block text-sm font-medium text-stone-700"
            >
              Team
            </label>
            <select
              id="temp-submission-team"
              name="team_id"
              required
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="temp-submission-time"
              className="block text-sm font-medium text-stone-700"
            >
              Submission time
            </label>
            <input
              id="temp-submission-time"
              name="submitted_at"
              type="datetime-local"
              required
              value={submittedAt}
              onChange={(e) => setSubmittedAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-stone-700">Photos</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {photoUrls.map((url) => (
                <div
                  key={url}
                  className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                  style={imageAspectStyle(PHOTO_REVIEW_ASPECT)}
                >
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                  <input type="hidden" name="photo_url" value={url} />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {isUploading ? "Uploading…" : "Upload photo"}
              </button>
            </div>
            {uploadError && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {uploadError}
              </p>
            )}
          </div>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || isUploading || photoUrls.length === 0}
              className="rounded-xl bg-huntly-forest px-4 py-2 text-sm font-medium text-huntly-cream hover:bg-huntly-leaf disabled:opacity-50"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add submission"}
            </button>
          </div>
        </form>

        <ImageCropModal
          open={cropOpen}
          file={pendingFile}
          aspect={PHOTO_REVIEW_ASPECT}
          onCancel={() => {
            setCropOpen(false);
            setPendingFile(null);
          }}
          onConfirm={handleConfirmCrop}
        />
      </div>
    </div>
  );
}

export function TemporarySubmissionModal({
  open,
  onClose,
  activityId,
  teams,
  editing,
}: Props) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <TemporarySubmissionForm
      key={editing ? `edit-${editing.id}` : "create"}
      activityId={activityId}
      teams={teams}
      editing={editing}
      onClose={onClose}
    />
  );
}
