"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

type RequirementOption = {
  value: string;
  label: string;
};

type CategoryOption = {
  id: number;
  name: string | null;
};

type BadgeRow = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  badge_type?: "milestone" | "manual";
  category: "xp" | "pack" | "team" | "special";
  requirement_type: string;
  requirement_value: number;
  requirement_category?: string | null;
  sort_group?: string | null;
  is_active?: boolean | null;
  is_hidden_until_awarded?: boolean | null;
};

type ExistingBadgeEditorCardProps = {
  badge: BadgeRow;
  categories: CategoryOption[];
  requirementOptions: RequirementOption[];
  sortGroups: string[];
  action: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

export function ExistingBadgeEditorCard({
  badge,
  categories,
  requirementOptions,
  sortGroups,
  action,
  deleteAction,
}: ExistingBadgeEditorCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [badgeType, setBadgeType] = useState<"milestone" | "manual">(
    badge.badge_type ?? "milestone"
  );
  const [track, setTrack] = useState<string>(badge.requirement_type);
  const [badgeGroupMode, setBadgeGroupMode] = useState<"existing" | "new">("existing");
  const [selectedBadgeGroup, setSelectedBadgeGroup] = useState<string>(
    badge.sort_group ?? sortGroups[0] ?? "General"
  );
  const [newBadgeGroup, setNewBadgeGroup] = useState("");

  const showCategory = useMemo(
    () => badgeType === "milestone" && track === "activities_by_category",
    [badgeType, track]
  );

  const hasImageUrl = typeof badge.image_url === "string" && badge.image_url.startsWith("http");
  const mustAlwaysHide = badgeType === "manual";
  const resolvedBadgeGroup =
    badgeGroupMode === "new"
      ? (newBadgeGroup.trim() || selectedBadgeGroup || "General")
      : (selectedBadgeGroup || "General");
  const [state, formAction] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => action(formData),
    { error: undefined }
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
      onSubmit={() => setHasAttemptedSubmit(true)}
    >
      <input type="hidden" name="id" value={badge.id} />

      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-xl">
          {hasImageUrl ? (
            <Image
              src={badge.image_url}
              alt={`${badge.name} badge image`}
              width={56}
              height={56}
              className="h-full w-full object-contain"
              unoptimized={!badge.image_url.includes("supabase.co")}
            />
          ) : (
            <span>{badge.image_url || "🏆"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">{badge.name}</p>
          <p className="text-sm text-stone-600">{badge.description}</p>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-stone-700"
        >
          <span>{isOpen ? "Hide badge details" : "Show badge details"}</span>
          <svg
            className={`h-5 w-5 shrink-0 text-stone-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen ? (
          <div className="grid gap-3 border-t border-stone-200 p-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Badge name
            </label>
            <input
              name="name"
              defaultValue={badge.name}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Description
            </label>
            <input
              name="description"
              defaultValue={badge.description}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Badge image URL
            </label>
            <input
              name="image_url"
              defaultValue={badge.image_url}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Upload badge image
            </label>
            <input
              name="image_file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="w-full text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Badge type
            </label>
            <select
              name="badge_type"
              value={badgeType}
              onChange={(e) => setBadgeType(e.target.value as "milestone" | "manual")}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="milestone">Milestone</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {badgeType === "milestone" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
                  Unlock track
                </label>
                <select
                  name="requirement_type"
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {requirementOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
                  Target value
                </label>
                <input
                  name="requirement_value"
                  type="number"
                  defaultValue={badge.requirement_value}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              {showCategory && (
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
                    Category requirement
                  </label>
                  <select
                    name="requirement_category"
                    defaultValue={badge.requirement_category ?? ""}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">No category requirement</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name ?? `Category ${category.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <input type="hidden" name="requirement_type" value="xp_gained" />
              <input type="hidden" name="requirement_value" value="1" />
              <input type="hidden" name="requirement_category" value="" />
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Badge group
            </label>
            {badgeGroupMode === "existing" ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedBadgeGroup}
                  onChange={(e) => setSelectedBadgeGroup(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {sortGroups.length === 0 ? (
                    <option value="General">General</option>
                  ) : (
                    sortGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setBadgeGroupMode("new")}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  title="Create new badge group"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={newBadgeGroup}
                  onChange={(e) => setNewBadgeGroup(e.target.value)}
                  placeholder="New badge group"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setBadgeGroupMode("existing")}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  title="Choose existing group"
                >
                  ▼
                </button>
              </div>
            )}
            <input type="hidden" name="sort_group" value={resolvedBadgeGroup} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={badge.is_active ?? true} />
            Active
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_hidden_until_awarded"
              defaultChecked={mustAlwaysHide || (badge.is_hidden_until_awarded ?? false)}
              disabled={mustAlwaysHide}
            />
            Hidden until awarded
          </label>
          {mustAlwaysHide ? (
            <input type="hidden" name="is_hidden_until_awarded" value="on" />
          ) : null}

          <div className="flex items-center gap-2">
            <SaveBadgeSubmitButton />
            <button
              type="submit"
              formAction={async (formData) => {
                await deleteAction(formData);
              }}
              onClick={(e) => {
                const ok = window.confirm(
                  "Delete this badge? This will also remove awarded records tied to it."
                );
                if (!ok) e.preventDefault();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              Delete
            </button>
          </div>
          </div>
        ) : null}
      </div>
      {state?.error ? (
        <div
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}
      {hasAttemptedSubmit && !state?.error ? (
        <div className="mt-3 text-sm text-green-700" role="status">
          Badge saved successfully.
        </div>
      ) : null}
    </form>
  );
}

function SaveBadgeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}
