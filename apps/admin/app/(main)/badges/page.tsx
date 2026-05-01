import {
  assignBadgeToProfile,
  createBadge,
  deleteBadge,
  getBadgesAdminData,
  renameBadgeGroup,
  updateBadge,
} from "./actions";
import { QuickBadgeCreateForm } from "./QuickBadgeCreateForm";
import { ExistingBadgeEditorCard } from "./ExistingBadgeEditorCard";
import { ManualAssignmentForm } from "./ManualAssignmentForm";

export const dynamic = "force-dynamic";

const requirementOptions = [
  { value: "xp_gained", label: "Total points earned" },
  { value: "packs_completed", label: "Mission chapters completed" },
  { value: "activities_completed", label: "Missions completed" },
  { value: "activities_by_category", label: "Missions completed by category" },
  { value: "team_contribution", label: "Individual team contribution" },
];

export default async function BadgesAdminPage() {
  const { badges, profiles, categories, awards } = await getBadgesAdminData();
  const sortGroups = Array.from(
    new Set(
      badges
        .map((b) => (typeof b.sort_group === "string" ? b.sort_group.trim() : ""))
        .filter((s) => s.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  const badgesByGroup = badges.reduce<Record<string, typeof badges>>((acc, badge) => {
    const key =
      typeof badge.sort_group === "string" && badge.sort_group.trim().length > 0
        ? badge.sort_group.trim()
        : "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(badge);
    return acc;
  }, {});
  const groupedEntries = Object.entries(badgesByGroup).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Badges</h1>
        <p className="mt-1 text-sm text-stone-500">
          Create and manage milestone and one-off badges without app updates.
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Create badge</h2>
        <QuickBadgeCreateForm
          action={createBadge}
          requirementOptions={requirementOptions}
          categories={categories}
          sortGroups={sortGroups}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Existing badges</h2>
        {groupedEntries.map(([groupName, groupBadges]) => (
          <div
            key={groupName}
            className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/60 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                Badge group: {groupName}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">
                  {groupBadges.length} badge{groupBadges.length === 1 ? "" : "s"}
                </span>
                <form
                  action={async (formData) => {
                    await renameBadgeGroup(formData);
                  }}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="old_group" value={groupName} />
                  <input
                    type="text"
                    name="new_group"
                    defaultValue={groupName}
                    className="w-40 rounded-lg border border-stone-300 px-2 py-1 text-xs"
                    aria-label={`Rename badge group ${groupName}`}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Edit
                  </button>
                </form>
              </div>
            </div>
            {groupBadges.map((badge) => (
              <ExistingBadgeEditorCard
                key={badge.id}
                badge={badge}
                categories={categories}
                requirementOptions={requirementOptions}
                sortGroups={sortGroups}
                action={updateBadge}
                deleteAction={deleteBadge}
              />
            ))}
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Manual assignment</h2>
        <ManualAssignmentForm
          action={assignBadgeToProfile}
          badges={badges}
          profiles={profiles}
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Recent awarded users</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="px-2 py-2">Badge ID</th>
                <th className="px-2 py-2">Badge</th>
                <th className="px-2 py-2">Profile</th>
                <th className="px-2 py-2">Earned</th>
              </tr>
            </thead>
            <tbody>
              {awards.map((award, idx) => {
                const badgesRelation = award.badges as { name?: string } | Array<{ name?: string }> | null;
                const badgeName = Array.isArray(badgesRelation)
                  ? badgesRelation[0]?.name
                  : badgesRelation?.name;
                const profilesRelation = award.profiles as
                  | { name?: string; nickname?: string }
                  | Array<{ name?: string; nickname?: string }>
                  | null;
                const profile = Array.isArray(profilesRelation)
                  ? profilesRelation[0]
                  : profilesRelation;

                return (
                  <tr key={`${award.badge_id}-${award.profile_id}-${idx}`} className="border-b border-stone-100">
                    <td className="px-2 py-2">#{award.badge_id}</td>
                    <td className="px-2 py-2">{badgeName ?? "-"}</td>
                    <td className="px-2 py-2">
                      {profile?.nickname || profile?.name || `Profile ${award.profile_id}`}
                    </td>
                    <td className="px-2 py-2">
                      {award.earned_at
                        ? new Date(award.earned_at).toLocaleString("en-GB")
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
