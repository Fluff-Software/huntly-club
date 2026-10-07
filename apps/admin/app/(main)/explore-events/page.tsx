import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isoToLondonLocal } from "@/lib/london-time";
import { ExploreEventForm, type ExploreEventInitial } from "./ExploreEventForm";

export const dynamic = "force-dynamic";

async function getEvents(): Promise<ExploreEventInitial[]> {
  const supabase = createServerSupabaseClient();
  const [{ data: events, error }, { data: cards, error: cardsError }] = await Promise.all([
    supabase
      .from("explore_events")
      .select("id, slug, name, starts_at, ends_at, pack_chance, is_active")
      .order("starts_at", { ascending: false }),
    supabase.from("explore_cards").select("event_id").not("event_id", "is", null),
  ]);
  if (error) throw new Error(error.message);
  if (cardsError) throw new Error(cardsError.message);

  const cardCounts = new Map<string, number>();
  for (const c of cards ?? []) {
    const id = String(c.event_id);
    cardCounts.set(id, (cardCounts.get(id) ?? 0) + 1);
  }

  const now = Date.now();
  return (events ?? []).map((e) => ({
    id: e.id,
    slug: e.slug,
    name: e.name,
    startsAtLocal: isoToLondonLocal(e.starts_at),
    endsAtLocal: isoToLondonLocal(e.ends_at),
    packChancePercent: Math.round(Number(e.pack_chance) * 10000) / 100,
    isActive: e.is_active,
    cardCount: cardCounts.get(e.id) ?? 0,
    live:
      e.is_active &&
      now >= new Date(e.starts_at).getTime() &&
      now < new Date(e.ends_at).getTime(),
  }));
}

export default async function ExploreEventsPage() {
  const events = await getEvents();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Explore Events</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-500">
          Limited-time packs (e.g. Halloween). While an event is live, each stop claim has
          the chance below of banking that event&apos;s pack instead of a normal one. Event
          cards are managed under Explore Cards.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No events yet.
        </p>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <ExploreEventForm key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
