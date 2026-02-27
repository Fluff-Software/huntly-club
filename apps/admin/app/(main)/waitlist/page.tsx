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
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
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
                  <td className="px-6 py-4 text-sm text-stone-700 max-w-md">
                    {row.notes ? (
                      <span className="line-clamp-3 whitespace-pre-wrap">
                        {row.notes}
                      </span>
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
      )}
    </div>
  );
}

