import { redirect } from "next/navigation";
import { createSeason } from "../actions";
import { Button } from "@/components/Button";
import { SeasonForm } from "../SeasonForm";

export default function NewSeasonPage() {
  async function submit(formData: FormData) {
    "use server";
    const result = await createSeason({}, formData);
    if (result.error) return result;
    redirect("/seasons");
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">New season</h1>
      <SeasonForm action={submit} />
      <p className="mt-4">
        <Button href="/seasons" variant="ghost" size="md">
          Cancel
        </Button>
      </p>
    </div>
  );
}
