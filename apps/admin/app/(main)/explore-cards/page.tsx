import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { ToggleActiveButton } from "./ToggleActiveButton";

type ExploreCardRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  image_path: string;
  base_weight: number;
  is_active: boolean;
  sort_order: number;
};

async function getCards(): Promise<ExploreCardRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("explore_cards")
    .select(
      "id, slug, name, description, category, rarity, image_path, base_weight, is_active, sort_order"
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExploreCardRow[];
}

const RARITY_COLORS: Record<string, string> = {
  common: "bg-blue-100 text-blue-800",
  uncommon: "bg-emerald-100 text-emerald-800",
  rare: "bg-purple-100 text-purple-800",
  very_rare: "bg-amber-100 text-amber-900",
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function Thumb({ url, name }: { url: string; name: string }) {
  if (!url?.startsWith("http")) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-semibold text-stone-400">
        No art
      </div>
    );
  }
  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
      <Image
        src={url}
        alt={name}
        fill
        className="object-cover"
        unoptimized={!url.includes("supabase.co")}
      />
    </div>
  );
}

export default async function ExploreCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cards = await getCards();
  const { error: queryError } = await searchParams;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Explore Cards</h1>
          <p className="mt-1 text-sm text-stone-500">
            Catalogue cards awarded at Explore stops. Soft-deactivate to hide without
            deleting claim history.
          </p>
        </div>
        <Button href="/explore-cards/new" size="md" className="sm:shrink-0">
          New card
        </Button>
      </div>

      {queryError ? (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {queryError}
        </div>
      ) : null}

      {cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No cards yet. Create one to get started.
        </p>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {cards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Thumb url={card.image_path} name={card.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900">{card.name}</p>
                    <p className="text-xs text-stone-500">{card.slug}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium capitalize text-stone-700">
                        {formatLabel(card.category)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          RARITY_COLORS[card.rarity] ?? "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {formatLabel(card.rarity)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          card.is_active
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {card.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    href={`/explore-cards/${card.id}/edit`}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <ToggleActiveButton
                    id={card.id}
                    name={card.name}
                    isActive={card.is_active}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm sm:block">
            <table className="min-w-full divide-y divide-stone-200">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Card
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Rarity
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Weight
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Sort
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {cards.map((card) => (
                  <tr key={card.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb url={card.image_path} name={card.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900">
                            {card.name}
                          </p>
                          <p className="truncate text-xs text-stone-500">{card.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-stone-700">
                      {formatLabel(card.category)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          RARITY_COLORS[card.rarity] ?? "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {formatLabel(card.rarity)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-700">
                      {card.base_weight}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-700">
                      {card.sort_order}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          card.is_active
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {card.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          href={`/explore-cards/${card.id}/edit`}
                          variant="secondary"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <ToggleActiveButton
                          id={card.id}
                          name={card.name}
                          isActive={card.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
