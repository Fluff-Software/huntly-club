"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CategoryIconModal } from "./CategoryIconModal";
import { saveCategories, getCategories, type CategoryEditRow } from "./actions";
import { uploadCategoryIcon } from "@/lib/upload-actions";

type RowWithPending = CategoryEditRow & {
  pendingIconFile?: File;
  pendingIconPreviewUrl?: string;
};

function serialize(rows: RowWithPending[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      icon: r.icon,
      name: r.name,
      _deleted: r._deleted,
      hasPendingFile: !!r.pendingIconFile,
    }))
  );
}

export function CategoriesList({ initial }: { initial: CategoryEditRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<RowWithPending[]>(() =>
    initial.length ? initial : [{ id: 0, icon: null, name: "" }]
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => serialize(rows));
  const [modalForIndex, setModalForIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = serialize(rows) !== savedSnapshot;

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { id: 0, icon: null, name: "" }]);
  }, []);

  const updateRow = useCallback((index: number, patch: Partial<RowWithPending>) => {
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      if (row?.pendingIconPreviewUrl && (patch.pendingIconFile !== undefined || patch.icon !== undefined)) {
        URL.revokeObjectURL(row.pendingIconPreviewUrl);
      }
      next[index] = { ...row, ...patch };
      return next;
    });
  }, []);

  const deleteRow = useCallback((index: number) => {
    setRows((prev) => {
      const row = prev[index];
      if (row.id > 0) return prev.map((r, i) => (i === index ? { ...r, _deleted: true } : r));
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaving(true);
    setError(null);
    const toSave = rows.filter((r) => !r._deleted) as RowWithPending[];
    const resolvedRows: CategoryEditRow[] = [];
    for (const row of toSave) {
      if (row.pendingIconFile) {
        const formData = new FormData();
        formData.set("file", row.pendingIconFile);
        const uploadResult = await uploadCategoryIcon(formData);
        if (uploadResult.error) {
          setError(uploadResult.error);
          setSaving(false);
          toSave.forEach((r) => r.pendingIconPreviewUrl && URL.revokeObjectURL(r.pendingIconPreviewUrl));
          return;
        }
        resolvedRows.push({
          id: row.id,
          icon: uploadResult.url ?? row.icon,
          name: row.name,
        });
      } else {
        resolvedRows.push({
          id: row.id,
          icon: row.icon,
          name: row.name,
        });
      }
    }
    const result = await saveCategories(resolvedRows);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      toSave.forEach((r) => r.pendingIconPreviewUrl && URL.revokeObjectURL(r.pendingIconPreviewUrl));
      return;
    }
    toSave.forEach((r) => r.pendingIconPreviewUrl && URL.revokeObjectURL(r.pendingIconPreviewUrl));
    const fresh = await getCategories();
    const next = fresh.length ? fresh : [{ id: 0, icon: null, name: "" }];
    setRows(next);
    setSavedSnapshot(serialize(next));
    router.refresh();
    setSaving(false);
  }, [hasChanges, rows, router]);

  const handleCancel = useCallback(() => {
    setRows((prev) => {
      prev.forEach((r) => r.pendingIconPreviewUrl && URL.revokeObjectURL(r.pendingIconPreviewUrl));
      return JSON.parse(savedSnapshot);
    });
    setError(null);
  }, [savedSnapshot]);

  const visibleRows = rows.filter((r) => !r._deleted);

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="max-w-2xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full table-fixed divide-y divide-stone-200">
          <thead>
            <tr>
              <th className="w-20 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Icon
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Name
              </th>
              <th className="w-20 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-stone-500">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rows.map((row, index) => {
              if (row._deleted) return null;
              return (
                <tr key={row.id ? `row-${row.id}` : `new-${index}`}>
                  <td className="w-20 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setModalForIndex(index)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100"
                    >
                      {(row.pendingIconPreviewUrl ?? row.icon) ? (
                        <Image
                          src={row.pendingIconPreviewUrl ?? row.icon ?? ""}
                          alt=""
                          width={40}
                          height={40}
                          className="object-cover"
                          unoptimized={!row.icon?.includes("supabase.co")}
                        />
                      ) : (
                        <span className="text-stone-400">+</span>
                      )}
                    </button>
                  </td>
                  <td className="min-w-0 px-3 py-2.5">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      placeholder="Category name"
                      className="w-full min-w-0 max-w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                    />
                  </td>
                  <td className="w-20 px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRow(index)}
                      className="inline-flex rounded-lg border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-100"
                      aria-label="Delete category"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-dashed border-stone-400 px-4 py-2 text-sm font-medium text-stone-600 hover:border-huntly-sage hover:text-huntly-forest"
        >
          Create
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-huntly-leaf"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <CategoryIconModal
        isOpen={modalForIndex !== null}
        onClose={() => setModalForIndex(null)}
        currentIcon={
          modalForIndex != null
            ? rows[modalForIndex]?.pendingIconPreviewUrl ?? rows[modalForIndex]?.icon ?? null
            : null
        }
        initialPendingFile={modalForIndex != null ? rows[modalForIndex]?.pendingIconFile : undefined}
        onSelect={(url, file) => {
          if (modalForIndex == null) return;
          if (file) {
            const prev = rows[modalForIndex];
            if (prev?.pendingIconPreviewUrl) URL.revokeObjectURL(prev.pendingIconPreviewUrl);
            updateRow(modalForIndex, {
              pendingIconFile: file,
              pendingIconPreviewUrl: URL.createObjectURL(file),
            });
          } else {
            updateRow(modalForIndex, { icon: url ?? null, pendingIconFile: undefined, pendingIconPreviewUrl: undefined });
          }
          setModalForIndex(null);
        }}
      />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
