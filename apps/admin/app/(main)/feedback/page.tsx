import { getFeedbackPage } from "./actions";
import { FeedbackListClient } from "./FeedbackListClient";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const { items: initialItems, hasMore: initialHasMore } = await getFeedbackPage(
    0,
    50
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Feedback</h1>
          <p className="mt-1 text-sm text-stone-500">
            Feedback sent from the Feedback tab in the Huntly World mobile app.
          </p>
        </div>
      </div>

      {initialItems.length === 0 && !initialHasMore ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No feedback has been submitted yet.
        </p>
      ) : (
        <FeedbackListClient
          initialItems={initialItems}
          initialHasMore={initialHasMore}
        />
      )}
    </div>
  );
}

