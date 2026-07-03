"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import {
  addSimulatedActivityPhoto,
  deleteSimulatedActivityPhoto,
  listSimulatedActivityPhotos,
  type ActivityOption,
  type SimulatedActivityPhoto,
} from "./actions";

type Props = { activities: ActivityOption[] };

export function PhotoPoolManager({ activities }: Props) {
  const [activityId, setActivityId] = useState<number | null>(activities[0]?.id ?? null);
  const [photos, setPhotos] = useState<SimulatedActivityPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activityId == null) {
      setPhotos([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSimulatedActivityPhotos(activityId)
      .then((result) => {
        if (!cancelled) setPhotos(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load photos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || activityId == null) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await addSimulatedActivityPhoto(activityId, formData);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (result.error) {
      setError(result.error);
      return;
    }
    const refreshed = await listSimulatedActivityPhotos(activityId);
    setPhotos(refreshed);
  }

  async function handleDelete(photoId: number) {
    setError(null);
    const result = await deleteSimulatedActivityPhoto(photoId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-stone-900">Photo pool</h2>
      <p className="mt-1 text-sm text-stone-500">
        Upload photos per mission for the drip to attach to simulated completions.
        Missions with no photos here just post without one.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={activityId ?? ""}
          onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
        >
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleUpload}
          disabled={activityId == null || uploading}
          className="block text-sm text-stone-600 file:mr-2 file:rounded-lg file:border-0 file:bg-huntly-forest file:px-4 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-50"
        />
        {uploading && <span className="text-sm text-stone-500">Uploading…</span>}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-stone-500">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">No photos uploaded for this mission yet.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="group relative h-24 w-24 overflow-hidden rounded-lg border border-stone-200"
            >
              <Image
                src={p.photoUrl}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
