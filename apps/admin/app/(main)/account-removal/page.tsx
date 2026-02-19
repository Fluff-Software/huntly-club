import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ApproveDenyButtons } from "./ApproveDenyButtons";

const TABS = [
  { value: "for-approval", label: "For Approval" },
  { value: "pending", label: "Pending (can still be canceled)" },
  { value: "denied", label: "Denied" },
  { value: "canceled", label: "Canceled" },
  { value: "removed", label: "Removed" },
] as const;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type RequestRow = {
  id: number;
  user_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  email?: string | null;
};

async function getRequestsForTab(
  tab: (typeof TABS)[number]["value"]
): Promise<RequestRow[]> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

  let query = supabase
    .from("account_removal_requests")
    .select("id, user_id, reason, status, created_at")
    .order("created_at", { ascending: false });

  switch (tab) {
    case "for-approval":
      query = query.eq("status", "pending").lt("created_at", twentyFourHoursAgo);
      break;
    case "pending":
      query = query.eq("status", "pending").gte("created_at", twentyFourHoursAgo);
      break;
    case "denied":
      query = query.eq("status", "rejected");
      break;
    case "canceled":
      query = query.eq("status", "cancelled");
      break;
    case "removed":
      query = query.eq("status", "approved");
      break;
    default:
      return [];
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const withEmail: RequestRow[] = await Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.auth.admin.getUserById(row.user_id);
      return {
        ...row,
        email: data?.user?.email ?? null,
      };
    })
  );
  return withEmail;
}

export default async function AccountRemovalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab =
    TABS.find((t) => t.value === tabParam)?.value ?? "for-approval";
  const requests = await getRequestsForTab(tab);
  const isForApproval = tab === "for-approval";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Account Removal</h1>
        <p className="mt-1 text-sm text-stone-500">
          Users can request account removal from the app. Approve only after 24 hours;
          before that they can cancel. On approve, user data is deleted and email is
          set to (REMOVED).
        </p>
      </div>

      <nav
        className="mb-6 border-b border-stone-200"
        aria-label="Account removal tabs"
      >
        <ul className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <li key={t.value}>
              <Link
                href={`/account-removal?tab=${t.value}`}
                className={`block border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 ${
                  tab === t.value
                    ? "border-huntly-forest text-huntly-forest"
                    : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                }`}
                aria-current={tab === t.value ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No requests in this tab.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                  Requested
                </th>
                {isForApproval && (
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900">
                    {r.email ?? r.user_id}
                  </td>
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-stone-600">
                    {r.reason || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                    {new Date(r.created_at).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  {isForApproval && (
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <ApproveDenyButtons requestId={r.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
