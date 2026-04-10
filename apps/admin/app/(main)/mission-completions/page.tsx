import { getMissionCompletionsPage } from "./actions";
import { MissionCompletionsListClient } from "./MissionCompletionsListClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function MissionCompletionsPage() {
  const { items: initialItems, hasMore: initialHasMore } =
    await getMissionCompletionsPage(0, PAGE_SIZE);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">
            Mission Completions
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Review completed missions, debrief responses, and submitted images.
          </p>
        </div>
      </div>

      {initialItems.length === 0 && !initialHasMore ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No mission completions yet.
        </p>
      ) : (
        <MissionCompletionsListClient
          initialItems={initialItems}
          initialHasMore={initialHasMore}
        />
      )}
    </div>
  );
}
