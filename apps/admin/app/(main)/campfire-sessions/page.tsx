import { getCampfireListenStatsBySession, getCampfireSessions } from "./actions";
import { CampfireSessionsList } from "./components/CampfireSessionsList";

export default async function CampfireSessionsPage() {
  const [sessions, listenStats] = await Promise.all([
    getCampfireSessions(),
    getCampfireListenStatsBySession(),
  ]);
  return (
    <div>
      <CampfireSessionsList sessions={sessions} listenStats={listenStats} />
    </div>
  );
}
