import {
  getSimulatedActivitySettings,
  getTeams,
  getFakeExplorers,
  getActivitiesForPhotoPool,
  getRecentSimulatedActivity,
} from "./actions";
import { SettingsCard } from "./SettingsCard";
import { FakeExplorerManager } from "./FakeExplorerManager";
import { PhotoPoolManager } from "./PhotoPoolManager";
import { RecentActivityTable } from "./RecentActivityTable";
import { PurgeButton } from "./PurgeButton";

export const dynamic = "force-dynamic";

export default async function SimulatedActivityPage() {
  const [settings, teams, explorers, activities, recentActivity] = await Promise.all([
    getSimulatedActivitySettings(),
    getTeams(),
    getFakeExplorers(),
    getActivitiesForPhotoPool(),
    getRecentSimulatedActivity(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Simulated Activity</h1>
        <p className="mt-1 text-sm text-stone-500">
          Maintain a pool of fake explorers that drip in mission completions, photos and
          team points, so the app feels active while the real user base grows. Fake
          explorers only ever show up as an anonymous explorer name, exactly like real
          users.
        </p>
      </div>

      <SettingsCard initial={settings} />

      <FakeExplorerManager explorers={explorers} teams={teams} />

      <PhotoPoolManager activities={activities} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Recent simulated activity</h2>
          <PurgeButton />
        </div>
        <RecentActivityTable items={recentActivity} />
      </div>
    </div>
  );
}
