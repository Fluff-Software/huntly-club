import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { updateExploreCard } from "../../actions";
import { ExploreCardForm, type ExploreCardInitial } from "../../ExploreCardForm";

async function getCard(id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("explore_cards")
    .select(
      "id, slug, name, description, category, rarity, image_path, base_weight, habitat_weights, is_active, sort_order"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export default async function EditExploreCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const card = await getCard(id);
  if (!card) notFound();

  const habitatWeights =
    card.habitat_weights &&
    typeof card.habitat_weights === "object" &&
    !Array.isArray(card.habitat_weights)
      ? (card.habitat_weights as Record<string, number>)
      : {};

  const initial: ExploreCardInitial = {
    slug: card.slug,
    name: card.name,
    description: card.description ?? "",
    category: card.category,
    rarity: card.rarity,
    image_path: card.image_path ?? "",
    base_weight: Number(card.base_weight),
    habitat_weights: habitatWeights,
    is_active: card.is_active !== false,
    sort_order: Number(card.sort_order ?? 0),
  };

  async function submit(formData: FormData) {
    "use server";
    const result = await updateExploreCard(id, {}, formData);
    if (!result.error) redirect("/explore-cards");
    return result;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">
        Edit card: {card.name}
      </h1>
      <p className="mb-8 text-sm text-stone-500">
        Changes apply to the live Explore catalogue after save.
      </p>
      <ExploreCardForm action={submit} initial={initial} mode="edit" />
      <p className="mt-4">
        <Button href="/explore-cards" variant="ghost" size="md">
          Back to cards
        </Button>
      </p>
    </div>
  );
}
