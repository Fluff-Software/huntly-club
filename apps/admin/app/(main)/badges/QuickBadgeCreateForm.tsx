"use client";

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

type QuickBadgeCreateFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
  requirementOptions: RequirementOption[];
  categories: CategoryOption[];
  sortGroups: string[];
};

export function QuickBadgeCreateForm({
  action,
  requirementOptions,
  categories,
  sortGroups,
}: QuickBadgeCreateFormProps) {
  const [badgeType, setBadgeType] = useState<"milestone" | "manual">("milestone");
  const [track, setTrack] = useState<string>(requirementOptions[0]?.value ?? "xp_gained");
  const [badgeGroupMode, setBadgeGroupMode] = useState<"existing" | "new">("existing");
  const [selectedBadgeGroup, setSelectedBadgeGroup] = useState<string>(
    sortGroups[0] ?? "General"
  );
  const [newBadgeGroup, setNewBadgeGroup] = useState("");
  const showCategory = useMemo(() => track === "activities_by_category", [track]);
  const mustAlwaysHide = badgeType === "manual";
  const [state, formAction] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => action(formData),
    { error: undefined }
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const resolvedBadgeGroup =
    badgeGroupMode === "new"
      ? (newBadgeGroup.trim() || "General")
      : (selectedBadgeGroup.trim() || "General");

  return (
    <form
      action={formAction}
      className="mt-4 grid gap-3 md:grid-cols-2"
      onSubmit={() => setHasAttemptedSubmit(true)}
    >
      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
          Badge name
        </label>
        <input
          name="name"
          required
          placeholder="Badge name"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
          Description
        </label>
        <input
          name="description"
          placeholder="Optional description"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
          Badge image
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
          <option value="milestone">Milestone (auto unlock)</option>
          <option value="manual">One-off manual badge</option>
        </select>
      </div>

      {badgeType === "milestone" ? (
        <>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
              Unlock track
            </label>
            <select
              name="track"
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
              name="target_value"
              type="number"
              defaultValue={1}
              min={1}
              placeholder="Target number"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="track" value="xp_gained" />
          <input type="hidden" name="target_value" value="1" />
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

      {badgeType === "milestone" && showCategory && (
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-stone-600">
            Category requirement
          </label>
          <select
            name="requirement_category"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name ?? `Category ${category.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-700 md:col-span-2">
        <input
          type="checkbox"
          name="is_hidden_until_awarded"
          defaultChecked={mustAlwaysHide}
          disabled={mustAlwaysHide}
        />
        Hidden until awarded
      </label>
      {mustAlwaysHide ? (
        <input type="hidden" name="is_hidden_until_awarded" value="on" />
      ) : null}
      <p className="-mt-1 text-xs text-stone-500 md:col-span-2">
        If enabled, this badge is invisible to users until it has been awarded to
        them.
      </p>

      <CreateBadgeSubmitButton />
      {state?.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 md:col-span-2"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}
      {hasAttemptedSubmit && !state?.error ? (
        <div className="text-sm text-green-700 md:col-span-2" role="status">
          Badge created successfully.
        </div>
      ) : null}
    </form>
  );
}

function CreateBadgeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white disabled:opacity-70 md:col-span-2"
    >
      {pending ? "Creating badge..." : "Create badge"}
    </button>
  );
}
