import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ReactNode } from "react";

const PHOTO_STATUS_FOR_REVIEW = 0;
const PHOTO_STATUS_APPROVED = 1;
const PHOTO_STATUS_REJECTED = 2;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type RecentCompletion = { id: number; completed_at: string; activityTitle: string; profileName: string };
type RecentFeedback = {
  id: number;
  created_at: string;
  source: string | null;
  screen: string | null;
  message: string | null;
  handled: boolean | null;
};
type RecentWaitlistSignup = { id: number; email: string; source: string | null; created_at: string };

function buildDailySeries(timestamps: number[], days: number, nowMs: number): number[] {
  const result = Array.from({ length: days }, () => 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date(nowMs);
  todayStart.setHours(0, 0, 0, 0);
  const startMs = todayStart.getTime() - (days - 1) * dayMs;

  for (const ts of timestamps) {
    if (ts < startMs) continue;
    const idx = Math.floor((ts - startMs) / dayMs);
    if (idx >= 0 && idx < days) result[idx] += 1;
  }
  return result;
}

async function getAuthUserStats(nowMs: number) {
  const supabase = createServerSupabaseClient();
  const perPage = 1000;
  let page = 1;
  let verifiedTotal = 0;
  let unverifiedTotal = 0;
  let verifiedLast7Days = 0;
  let verifiedPrev7Days = 0;
  const verifiedRecentTimestamps: number[] = [];
  const sevenDaysAgoMs = nowMs - SEVEN_DAYS_MS;
  const fourteenDaysAgoMs = nowMs - FOURTEEN_DAYS_MS;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];

    for (const user of users) {
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      if (user.email_confirmed_at) {
        verifiedTotal += 1;
        if (createdAt >= fourteenDaysAgoMs) verifiedRecentTimestamps.push(createdAt);
        if (createdAt >= sevenDaysAgoMs) verifiedLast7Days += 1;
        else if (createdAt >= fourteenDaysAgoMs) verifiedPrev7Days += 1;
      } else {
        unverifiedTotal += 1;
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return {
    verifiedTotal,
    unverifiedTotal,
    verifiedLast7Days,
    verifiedPrev7Days,
    verifiedSeries7: buildDailySeries(verifiedRecentTimestamps, 7, nowMs),
  };
}

async function getStats() {
  const supabase = createServerSupabaseClient();
  const nowMs = Date.now();
  const sevenDaysAgoIso = new Date(nowMs - SEVEN_DAYS_MS).toISOString();
  const fourteenDaysAgoIso = new Date(nowMs - FOURTEEN_DAYS_MS).toISOString();
  const twentyFourHoursAgoIso = new Date(nowMs - TWENTY_FOUR_HOURS_MS).toISOString();

  const [
    profilesRes,
    profiles7dRes,
    seasonsRes,
    chaptersRes,
    activitiesRes,
    categoriesRes,
    resourcesRes,
    completionsRes,
    completions7dRes,
    completions14dRowsRes,
    photosTotalRes,
    photosForReviewRes,
    photosApprovedRes,
    photosRejectedRes,
    feedbackTotalRes,
    feedbackHandledRes,
    feedbackRecentRes,
    waitlistTotalRes,
    waitlist7dRes,
    waitlist14dRowsRes,
    accountRemovalPendingRes,
    accountRemovalForApprovalRes,
    recentCompletionsRes,
    recentWaitlistRes,
    authUserStats,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgoIso),
    supabase.from("seasons").select("id", { count: "exact", head: true }),
    supabase.from("chapters").select("id", { count: "exact", head: true }),
    supabase.from("activities").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("parent_resources").select("id", { count: "exact", head: true }),
    supabase.from("user_activity_progress").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
    supabase
      .from("user_activity_progress")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null)
      .gte("completed_at", sevenDaysAgoIso),
    supabase
      .from("user_activity_progress")
      .select("completed_at")
      .not("completed_at", "is", null)
      .gte("completed_at", fourteenDaysAgoIso),
    supabase.from("user_activity_photos").select("photo_id", { count: "exact", head: true }),
    supabase.from("user_activity_photos").select("photo_id", { count: "exact", head: true }).eq("status", PHOTO_STATUS_FOR_REVIEW),
    supabase.from("user_activity_photos").select("photo_id", { count: "exact", head: true }).eq("status", PHOTO_STATUS_APPROVED),
    supabase.from("user_activity_photos").select("photo_id", { count: "exact", head: true }).eq("status", PHOTO_STATUS_REJECTED),
    supabase.from("user_feedback").select("id", { count: "exact", head: true }),
    supabase.from("user_feedback").select("id", { count: "exact", head: true }).eq("handled", true),
    supabase.from("user_feedback").select("id, created_at, source, screen, message, handled").order("created_at", { ascending: false }).limit(6),
    supabase.from("waitlist_signups").select("id", { count: "exact", head: true }),
    supabase.from("waitlist_signups").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgoIso),
    supabase.from("waitlist_signups").select("created_at").gte("created_at", fourteenDaysAgoIso),
    supabase.from("account_removal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("account_removal_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgoIso),
    supabase
      .from("user_activity_progress")
      .select("id, completed_at, activities ( title, name ), profiles ( name, nickname )")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(6),
    supabase.from("waitlist_signups").select("id, email, source, created_at").order("created_at", { ascending: false }).limit(6),
    getAuthUserStats(nowMs),
  ]);

  const feedbackTotal = feedbackTotalRes.count ?? 0;
  const feedbackHandled = feedbackHandledRes.count ?? 0;
  const feedbackUnhandled = Math.max(0, feedbackTotal - feedbackHandled);
  const feedbackHandledRate = feedbackTotal > 0 ? Math.round((feedbackHandled / feedbackTotal) * 100) : 0;

  const completionTimes = ((completions14dRowsRes.data ?? []) as Array<{ completed_at: string | null }>)
    .map((row) => (row.completed_at ? new Date(row.completed_at).getTime() : 0))
    .filter((ts) => ts > 0);
  const completionSeries7 = buildDailySeries(completionTimes, 7, nowMs);

  const waitlistTimes = ((waitlist14dRowsRes.data ?? []) as Array<{ created_at: string }>)
    .map((row) => new Date(row.created_at).getTime())
    .filter((ts) => ts > 0);
  const waitlistSeries7 = buildDailySeries(waitlistTimes, 7, nowMs);

  return {
    profiles: profilesRes.count ?? 0,
    profiles7d: profiles7dRes.count ?? 0,
    verifiedUsers: authUserStats.verifiedTotal,
    verifiedUsers7d: authUserStats.verifiedLast7Days,
    verifiedUsersDelta7d: authUserStats.verifiedLast7Days - authUserStats.verifiedPrev7Days,
    unverifiedUsers: authUserStats.unverifiedTotal,
    verifiedSeries7: authUserStats.verifiedSeries7,
    seasons: seasonsRes.count ?? 0,
    chapters: chaptersRes.count ?? 0,
    activities: activitiesRes.count ?? 0,
    categories: categoriesRes.count ?? 0,
    resources: resourcesRes.count ?? 0,
    missionCompletions: completionsRes.count ?? 0,
    missionCompletions7d: completions7dRes.count ?? 0,
    completionSeries7,
    photosTotal: photosTotalRes.count ?? 0,
    photosForReview: photosForReviewRes.count ?? 0,
    photosApproved: photosApprovedRes.count ?? 0,
    photosRejected: photosRejectedRes.count ?? 0,
    feedbackUnhandled,
    feedbackHandledRate,
    waitlistTotal: waitlistTotalRes.count ?? 0,
    waitlist7d: waitlist7dRes.count ?? 0,
    waitlistSeries7,
    accountRemovalPending: accountRemovalPendingRes.count ?? 0,
    accountRemovalForApproval: accountRemovalForApprovalRes.count ?? 0,
    recentCompletions: ((recentCompletionsRes.data ?? []) as Array<{
      id: number;
      completed_at: string | null;
      activities:
        | { title: string | null; name: string }
        | Array<{ title: string | null; name: string }>
        | null;
      profiles:
        | { name: string; nickname: string | null }
        | Array<{ name: string; nickname: string | null }>
        | null;
    }>).map((row): RecentCompletion => {
      const activity = Array.isArray(row.activities) ? row.activities[0] : row.activities;
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

      return {
        id: row.id,
        completed_at: row.completed_at ?? new Date(0).toISOString(),
        activityTitle: activity?.title?.trim() || activity?.name?.trim() || "Unknown mission",
        profileName: profile?.nickname?.trim() || profile?.name?.trim() || "Unknown profile",
      };
    }),
    recentFeedback: (feedbackRecentRes.data ?? []) as RecentFeedback[],
    recentWaitlist: (recentWaitlistRes.data ?? []) as RecentWaitlistSignup[],
  };
}

export default async function DashboardPage() {
  const stats = await getStats();
  const moderationTotal = stats.photosForReview + stats.photosApproved + stats.photosRejected;
  const reviewPercent = moderationTotal > 0 ? Math.round((stats.photosForReview / moderationTotal) * 100) : 0;
  const approvedPercent = moderationTotal > 0 ? Math.round((stats.photosApproved / moderationTotal) * 100) : 0;
  const rejectedPercent = Math.max(0, 100 - reviewPercent - approvedPercent);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-huntly-forest to-huntly-leaf p-6 text-white shadow-sm">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-white/85">Live operational overview across users, missions, content, and moderation.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AlertTile title="Needs photo review" value={stats.photosForReview} href="/photos/review" cta="Review photos" />
          <AlertTile
            title="Removal requests ready"
            value={stats.accountRemovalForApproval}
            href="/account-removal?tab=for-approval"
            cta="Open requests"
          />
          <AlertTile title="Unhandled feedback" value={stats.feedbackUnhandled} href="/feedback" cta="View feedback" />
          <AlertTile title="Unverified users" value={stats.unverifiedUsers} href="/users?tab=unverified" cta="Open users" />
        </div>
      </section>

      <DashboardSection title="Growth">
        <div className="grid gap-4 lg:grid-cols-3">
          <TrendCard
            label="Total users"
            value={stats.verifiedUsers}
            sublabel={`${stats.verifiedUsers7d} new in last 7 days`}
            delta={stats.verifiedUsersDelta7d}
            series={stats.verifiedSeries7}
          />
          <TrendCard
            label="Mission completions"
            value={stats.missionCompletions}
            sublabel={`${stats.missionCompletions7d} in last 7 days`}
            series={stats.completionSeries7}
          />
          <TrendCard
            label="Waitlist signups"
            value={stats.waitlistTotal}
            sublabel={`${stats.waitlist7d} in last 7 days`}
            series={stats.waitlistSeries7}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Operations">
        <div className="grid gap-4 xl:grid-cols-2">
          <InfoCard title="Photo moderation">
            <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="flex h-full w-full">
                <div className="bg-amber-400" style={{ width: `${reviewPercent}%` }} />
                <div className="bg-emerald-500" style={{ width: `${approvedPercent}%` }} />
                <div className="bg-rose-500" style={{ width: `${rejectedPercent}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <MetricMini label="For review" value={stats.photosForReview} tone="amber" />
              <MetricMini label="Approved" value={stats.photosApproved} tone="green" />
              <MetricMini label="Rejected" value={stats.photosRejected} tone="red" />
            </div>
          </InfoCard>

          <InfoCard title="Feedback handling">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-huntly-forest">{stats.feedbackHandledRate}%</p>
                <p className="text-xs text-stone-500">Handled rate</p>
              </div>
              <p className="text-sm text-stone-600">{stats.feedbackUnhandled} unhandled</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full bg-huntly-forest" style={{ width: `${stats.feedbackHandledRate}%` }} />
            </div>
          </InfoCard>
        </div>
      </DashboardSection>

      <DashboardSection title="Content Inventory">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatPill label="Seasons" value={stats.seasons} />
          <StatPill label="Chapters" value={stats.chapters} />
          <StatPill label="Missions" value={stats.activities} />
          <StatPill label="Categories" value={stats.categories} />
          <StatPill label="Resources" value={stats.resources} />
        </div>
      </DashboardSection>

      <DashboardSection title="Recent Activity">
        <div className="grid gap-4 xl:grid-cols-3">
          <FeedCard
            title="Mission completions"
            emptyText="No mission completions yet."
            items={stats.recentCompletions.map((item) => ({
              id: item.id,
              primary: item.activityTitle,
              secondary: `${item.profileName} • ${formatDateTime(item.completed_at)}`,
            }))}
          />
          <FeedCard
            title="Waitlist signups"
            emptyText="No waitlist signups yet."
            items={stats.recentWaitlist.map((item) => ({
              id: item.id,
              primary: item.email,
              secondary: `${(item.source ?? "Unknown source").trim()} • ${formatDateTime(item.created_at)}`,
            }))}
          />
          <FeedCard
            title="Feedback"
            emptyText="No feedback yet."
            items={stats.recentFeedback.map((item) => ({
              id: item.id,
              primary: (item.message ?? "No message").trim(),
              secondary: `${(item.source ?? "Unknown source").trim()}${item.screen ? ` / ${item.screen}` : ""} • ${item.handled ? "Handled" : "Unhandled"} • ${formatDateTime(item.created_at)}`,
            }))}
          />
        </div>
      </DashboardSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatPill label="Total profiles" value={stats.profiles} hint={`${stats.profiles7d} new in last 7 days`} />
        <StatPill label="Pending removal requests" value={stats.accountRemovalPending} />
      </div>
    </div>
  );
}

function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      {children}
    </section>
  );
}

function AlertTile({ title, value, href, cta }: { title: string; value: number; href: string; cta: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-black/15 p-4 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wide text-white/75">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <Link href={href} className="mt-2 inline-block text-xs text-white/85 underline decoration-white/40 underline-offset-2 hover:text-white">
        {cta}
      </Link>
    </div>
  );
}

function TrendCard({
  label,
  value,
  sublabel,
  series,
  delta,
}: {
  label: string;
  value: number;
  sublabel: string;
  series: number[];
  delta?: number;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-huntly-forest">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{sublabel}</p>
      {typeof delta === "number" ? (
        <p className={`mt-2 text-xs font-medium ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
          {delta >= 0 ? "+" : ""}
          {delta} vs previous 7d
        </p>
      ) : null}
      <div className="mt-3">
        <Sparkline series={series} />
      </div>
    </div>
  );
}

function Sparkline({ series }: { series: number[] }) {
  const max = Math.max(1, ...series);
  const width = 220;
  const height = 44;
  const points = series
    .map((value, idx) => {
      const x = (idx / Math.max(1, series.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full">
      <polyline fill="none" stroke="#2f5b34" strokeWidth="2.5" points={points} />
    </svg>
  );
}

function StatPill({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function MetricMini({ label, value, tone }: { label: string; value: number; tone: "amber" | "green" | "red" }) {
  const toneClass =
    tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-stone-800">{title}</h3>
      {children}
    </div>
  );
}

function FeedCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ id: number; primary: string; secondary: string }>;
  emptyText: string;
}) {
  return (
    <InfoCard title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-huntly-forest" />
              <div>
                <p className="line-clamp-2 text-sm text-stone-900">{item.primary}</p>
                <p className="line-clamp-2 text-xs text-stone-500">{item.secondary}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}
