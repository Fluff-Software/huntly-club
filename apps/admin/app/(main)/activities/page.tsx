import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";

type SessionRef = { id: number; title: string };

/** `release_date` from DB is YYYY-MM-DD; format without timezone shifts. */
function formatReleaseDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy.slice(-2)}`;
  }
  return isoDate;
}

function buildSessionsByActivityId(
  sessions: { id: number; title: string; missions: number[] | null }[]
): Record<number, SessionRef[]> {
  const map = new Map<number, SessionRef[]>();
  for (const session of sessions) {
    for (const missionId of session.missions ?? []) {
      const activityId = Number(missionId);
      if (!Number.isFinite(activityId)) continue;
      const list = map.get(activityId) ?? [];
      list.push({ id: session.id, title: session.title });
      map.set(activityId, list);
    }
  }
  const out: Record<number, SessionRef[]> = {};
  for (const [activityId, list] of map) {
    out[activityId] = [...list].sort((a, b) => a.title.localeCompare(b.title));
  }
  return out;
}

function CampfireCell({ sessions }: { sessions: SessionRef[] | undefined }) {
  if (!sessions?.length) {
    return (
      <span className="text-sm italic text-stone-400">Not in a session</span>
    );
  }
  if (sessions.length === 1) {
    const s = sessions[0];
    return (
      <Link
        href={`/campfire-sessions/${s.id}`}
        className="text-sm font-medium text-huntly-forest hover:underline"
      >
        {s.title}
      </Link>
    );
  }
  return (
    <ul className="space-y-0.5 text-sm text-stone-700">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/campfire-sessions/${s.id}`}
            className="font-medium text-huntly-forest hover:underline"
          >
            {s.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ReleaseDateCell({ releaseDate }: { releaseDate: string | null }) {
  if (!releaseDate) {
    return (
      <span className="text-sm italic text-amber-700">
        Not set
      </span>
    );
  }
  return (
    <span className="text-sm text-stone-700">{formatReleaseDate(releaseDate)}</span>
  );
}

async function getActivitiesWithProfilesPlayed() {
  const supabase = createServerSupabaseClient();

  const [activitiesRes, profilesCountRes, progressRes, sessionsRes] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, title, xp, created_at, release_date")
      .order("id"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_activity_progress").select("activity_id"),
    supabase.from("campfire_sessions").select("id, title, missions").order("id"),
  ]);

  if (activitiesRes.error) throw new Error(activitiesRes.error.message);
  if (profilesCountRes.error) throw new Error(profilesCountRes.error.message);
  if (progressRes.error) throw new Error(progressRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);

  const activities = activitiesRes.data ?? [];
  const totalProfiles = profilesCountRes.count ?? 0;
  const progressRows = progressRes.data ?? [];

  const progressCountByActivityId = progressRows.reduce<Record<number, number>>(
    (acc, row) => {
      acc[row.activity_id] = (acc[row.activity_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const sessionsByActivityId = buildSessionsByActivityId(
    (sessionsRes.data ?? []) as { id: number; title: string; missions: number[] | null }[]
  );

  return {
    activities,
    totalProfiles,
    progressCountByActivityId,
    sessionsByActivityId,
  };
}

export default async function ActivitiesPage() {
  const { activities, totalProfiles, progressCountByActivityId, sessionsByActivityId } =
    await getActivitiesWithProfilesPlayed();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">
            Missions
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Set a release date on each mission and add it to a campfire session&apos;s
            missions in scope for the mobile app.
          </p>
        </div>
        <Button href="/activities/new" size="md" className="sm:shrink-0">
          New mission
        </Button>
      </div>

      {activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No missions yet. Create one to get started.
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {activities.map((a) => (
              <article
                key={a.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-500">Mission</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-stone-900">
                      {a.name}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-700">{a.title}</p>
                    <p className="mt-1 text-xs text-stone-500">ID #{a.id}</p>
                  </div>

                  <Button
                    href={`/activities/${a.id}/edit`}
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                  >
                    Edit
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">XP</p>
                    <p className="mt-0.5 text-sm text-stone-900">{a.xp ?? "–"}</p>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Profiles played</p>
                    <p className="mt-0.5 text-sm text-stone-900">
                      {progressCountByActivityId[a.id] ?? 0} / {totalProfiles}
                    </p>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">
                      Release date
                    </p>
                    <div className="mt-0.5">
                      <ReleaseDateCell releaseDate={a.release_date} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Campfire</p>
                    <div className="mt-0.5">
                      <CampfireCell sessions={sessionsByActivityId[a.id]} />
                    </div>
                  </div>

                  <div className="col-span-2 rounded-lg border border-stone-200 bg-stone-50/40 px-3 py-2">
                    <p className="text-xs font-medium text-stone-500">Created</p>
                    <p className="mt-0.5 text-sm text-stone-900">
                      {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
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
                    Profiles played
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Release date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Campfire
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
                      {progressCountByActivityId[a.id] ?? 0} / {totalProfiles}
                    </td>
                    <td className="max-w-[12rem] px-6 py-4">
                      <ReleaseDateCell releaseDate={a.release_date} />
                    </td>
                    <td className="max-w-[14rem] px-6 py-4">
                      <CampfireCell sessions={sessionsByActivityId[a.id]} />
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
        </>
      )}
    </div>
  );
}
