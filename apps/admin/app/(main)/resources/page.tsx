import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { deleteResourceAction } from "./actions";

async function getResources() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("parent_resources")
    .select("id, title, description, file_url, sort_order, category, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function fileTypeLabel(url: string): string {
  if (!url) return "–";
  const lower = url.toLowerCase();
  if (lower.includes(".pdf") || lower.includes("application/pdf")) return "PDF";
  if (lower.match(/\.(jpe?g|png|webp|gif)(\?|$)/)) return "Image";
  return "File";
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resources = await getResources();
  const { error: queryError } = await searchParams;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Resources</h1>
          <p className="mt-1 text-sm text-stone-500">
            Downloadable resources for the Parent Zone in the app (e.g. PDFs, posters).
          </p>
        </div>
        <Button href="/resources/new" size="md" className="sm:shrink-0">
          New resource
        </Button>
      </div>

      {queryError && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {queryError}
        </div>
      )}

      {resources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No resources yet. Create one to get started.
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {resources.map((r) => (
              <article
                key={r.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-500">Resource</p>
                    <p className="mt-0.5 text-sm font-medium text-stone-900">{r.title}</p>
                    <p className="mt-1 text-sm text-stone-700">
                      {r.description || "–"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Type</p>
                    <p className="mt-0.5 text-sm text-stone-900">
                      {fileTypeLabel(r.file_url)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Created</p>
                    <p className="mt-0.5 text-sm text-stone-900">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button href={`/resources/${r.id}/edit`} variant="secondary" size="sm">
                    Edit
                  </Button>
                  <form action={deleteResourceAction} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      Delete
                    </Button>
                  </form>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm sm:block">
            <table className="min-w-full divide-y divide-stone-200">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900">
                      {r.title}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-stone-700">
                      {r.description || "–"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                      {fileTypeLabel(r.file_url)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          href={`/resources/${r.id}/edit`}
                          variant="secondary"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <form action={deleteResourceAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
