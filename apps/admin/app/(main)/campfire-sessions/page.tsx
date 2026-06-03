import { getCampfireSessions } from "./actions";
import { CampfireSessionsList } from "./components/CampfireSessionsList";

export default async function CampfireSessionsPage() {
  const sessions = await getCampfireSessions();
  return (
    <div>
      <CampfireSessionsList sessions={sessions} />
    </div>
  );
}
