import { createServerSupabaseClient } from "@/lib/supabase-server";

type WaitlistRow = {
  id: number;
  name: string | null;
  email: string;
  notes: string | null;
  source: string | null;
  created_at: string;
};

async function getWaitlist(): Promise<WaitlistRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("waitlist_signups")
    .select("id, name, email, notes, source, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as WaitlistRow[];
}

export default async function WaitlistPage() {
  const waitlist = await getWaitlist();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Waitlist</h1>
          <p className="mt-1 text-sm text-stone-500">
            People who&apos;ve joined the Huntly World waitlist from the website or app.
          </p>
        </div>
      </div>

      {waitlist.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No one has joined the waitlist yet.
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {waitlist.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-500">Person</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-stone-900">
                      {row.name ?? "—"}
                    </p>
                    <a
                      href={`mailto:${row.email}`}
                      className="mt-0.5 block truncate text-sm text-huntly-forest underline-offset-2 hover:underline"
                    >
                      {row.email}
                    </a>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-stone-500">Joined</p>
                    <p className="mt-0.5 text-sm text-stone-700">
                      {new Date(row.created_at).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Source</p>
                    <p className="mt-0.5 text-sm text-stone-900">{row.source ?? "—"}</p>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">ID</p>
                    <p className="mt-0.5 text-sm text-stone-900">#{row.id}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                  <p className="text-xs font-medium text-stone-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">
                    {row.notes?.trim() ? row.notes : "—"}
                  </p>
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
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Source
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Notes
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {waitlist.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900">
                      {row.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-800">
                      <a
                        href={`mailto:${row.email}`}
                        className="text-huntly-forest underline-offset-2 hover:underline"
                      >
                        {row.email}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                      {row.source ?? "—"}
                    </td>
                    <td className="max-w-md px-6 py-4 text-sm text-stone-700">
                      {row.notes ? (
                        <span className="line-clamp-3 whitespace-pre-wrap">{row.notes}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                      {new Date(row.created_at).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
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

