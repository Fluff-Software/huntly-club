"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CategoryIconModal } from "./CategoryIconModal";
import { saveCategories, getCategories, type CategoryEditRow } from "./actions";

function serialize(rows: CategoryEditRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({ id: r.id, icon: r.icon, name: r.name, _deleted: r._deleted }))
  );
}

export function CategoriesList({ initial }: { initial: CategoryEditRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<CategoryEditRow[]>(() =>
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

  const updateRow = useCallback((index: number, patch: Partial<CategoryEditRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
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
    const toSave = rows.filter((r) => !r._deleted);
    const result = await saveCategories(toSave);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    const fresh = await getCategories();
    const next = fresh.length ? fresh : [{ id: 0, icon: null, name: "" }];
    setRows(next);
    setSavedSnapshot(serialize(next));
    router.refresh();
    setSaving(false);
  }, [hasChanges, rows, router]);

  const handleCancel = useCallback(() => {
    setRows(JSON.parse(savedSnapshot));
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

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Icon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                Name
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rows.map((row, index) => {
              if (row._deleted) return null;
              return (
                <tr key={row.id ? `row-${row.id}` : `new-${index}`}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setModalForIndex(index)}
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100"
                    >
                      {row.icon ? (
                        <Image
                          src={row.icon}
                          alt=""
                          width={48}
                          height={48}
                          className="object-cover"
                          unoptimized={!row.icon.includes("supabase.co")}
                        />
                      ) : (
                        <span className="text-stone-400">+</span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      placeholder="Category name"
                      className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage"
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <button
                      type="button"
                      onClick={() => deleteRow(index)}
                      className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100"
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
        currentIcon={modalForIndex != null ? rows[modalForIndex]?.icon ?? null : null}
        onSelect={(url) => {
          if (modalForIndex != null) updateRow(modalForIndex, { icon: url });
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
