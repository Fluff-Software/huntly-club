import { redirect } from "next/navigation";
import { createActivity } from "../actions";
import { Button } from "@/components/Button";
import { ActivityForm } from "../ActivityForm";

export default function NewActivityPage() {
  async function submit(formData: FormData) {
    "use server";
    const result = await createActivity({}, formData);
    if (result.error) return result;
    redirect("/activities");
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        New mission
      </h1>
      <ActivityForm action={submit} />
      <p className="mt-4">
        <Button href="/activities" variant="ghost" size="md">
          Cancel
        </Button>
      </p>
    </div>
  );
}
