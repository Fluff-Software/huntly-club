import { notFound } from "next/navigation";
import { Jua, Comic_Neue } from "next/font/google";
import {
  ensureDefaultTracks,
  getEditorData,
} from "../actions";
import { CampfireEditorLoader } from "../components/CampfireEditorLoader";

const jua = Jua({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-jua" });
const comicNeue = Comic_Neue({ weight: ["400", "700"], subsets: ["latin"], display: "swap", variable: "--font-comic-neue" });

export default async function CampfireSessionEditorPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId: sessionIdStr } = await params;
  const sessionId = parseInt(sessionIdStr, 10);
  if (Number.isNaN(sessionId)) notFound();

  let editorData;
  try {
    editorData = await getEditorData(sessionId);
  } catch {
    notFound();
  }

  if (!editorData.session) notFound();

  const tracks = await ensureDefaultTracks(sessionId);
  const components = editorData.components;

  return (
    <div className={`-mx-4 -my-4 -mt-14 flex min-h-0 flex-1 flex-col bg-stone-950 md:-mx-8 md:-my-8 md:-mt-8 ${jua.variable} ${comicNeue.variable}`}>
      <CampfireEditorLoader
        session={editorData.session}
        initialTracks={tracks}
        initialComponents={components}
        activities={editorData.activities}
        captains={editorData.captains}
        approvedPhotos={editorData.approvedPhotos}
      />
    </div>
  );
}
