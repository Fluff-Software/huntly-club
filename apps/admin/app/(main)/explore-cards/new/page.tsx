import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { createExploreCard } from "../actions";
import { ExploreCardForm } from "../ExploreCardForm";

export default function NewExploreCardPage() {
  async function submit(formData: FormData) {
    "use server";
    const result = await createExploreCard({}, formData);
    if (result.error) return result;
    redirect("/explore-cards");
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">New Explore card</h1>
      <p className="mb-8 text-sm text-stone-500">
        Create a catalogue card. Preview updates as you type.
      </p>
      <ExploreCardForm action={submit} mode="create" />
      <p className="mt-4">
        <Button href="/explore-cards" variant="ghost" size="md">
          Cancel
        </Button>
      </p>
    </div>
  );
}
