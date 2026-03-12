import { createServerSupabaseClient } from "@/lib/supabase-server";

type FeedbackRow = {
  id: number;
  created_at: string;
  profile_id: number | null;
  team_id: number | null;
  user_id: string | null;
  source: string | null;
  screen: string | null;
  message: string | null;
  device_platform: string | null;
  device_model: string | null;
  app_version: string | null;
  app_build: string | null;
  app_environment: string | null;
  handled: boolean | null;
};

async function getFeedback(): Promise<FeedbackRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_feedback")
    .select(
      [
        "id",
        "created_at",
        "profile_id",
        "team_id",
        "user_id",
        "source",
        "screen",
        "message",
        "device_platform",
        "device_model",
        "app_version",
        "app_build",
        "app_environment",
        "handled",
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return (data as FeedbackRow[]) ?? [];
}

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const feedback = await getFeedback();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Feedback</h1>
          <p className="mt-1 text-sm text-stone-500">
            Feedback sent from the Testing tab in the Huntly World mobile app.
          </p>
        </div>
      </div>

      {feedback.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No feedback has been submitted yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead>
              <tr>
                <th className={thClass}>When</th>
                <th className={thClass}>Profile / Team</th>
                <th className={thClass}>User</th>
                <th className={thClass}>Message</th>
                <th className={thClass}>Device</th>
                <th className={thClass}>App</th>
                <th className={thClass}>Handled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {feedback.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>
                    <span className="block text-sm text-stone-900">
                      {new Date(row.created_at).toLocaleString("en-GB")}
                    </span>
                    {row.screen && (
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {row.screen}
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <span className="block text-sm text-stone-900">
                      {row.profile_id != null ? `Profile #${row.profile_id}` : "–"}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {row.team_id != null ? `Team #${row.team_id}` : ""}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className="block truncate text-sm text-stone-700">
                      {row.user_id ?? "–"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className="block text-sm text-stone-900">
                      {row.message?.slice(0, 120) ?? ""}
                      {row.message && row.message.length > 120 ? "…" : ""}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className="block text-sm text-stone-900">
                      {row.device_platform ?? "–"}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {row.device_model ?? ""}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className="block text-sm text-stone-900">
                      {row.app_version ?? "–"}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {row.app_build ?? ""}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.handled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.handled ? "Handled" : "New"}
                    </span>
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

const thClass =
  "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500";
const tdClass = "whitespace-nowrap px-6 py-4 align-top text-sm text-stone-700";

