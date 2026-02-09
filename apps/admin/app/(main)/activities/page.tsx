import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";

async function getActivities() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, title, xp, created_at")
    .order("id");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function ActivitiesPage() {
  const activities = await getActivities();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Activities
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Missions can be assigned to chapters when editing a chapter.
          </p>
        </div>
        <Button href="/activities/new" size="md">
          New mission
        </Button>
      </div>

      {activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No activities yet. Create one to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                >
                  ID
                </th>
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
                  Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                >
                  XP
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
              {activities.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                    {a.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900">
                    {a.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-700">{a.title}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                    {a.xp ?? "–"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                    {new Date(a.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Button
                      href={`/activities/${a.id}/edit`}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
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
