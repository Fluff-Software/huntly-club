import { redirect } from "next/navigation";
import { createActivity } from "../actions";
import { getCategories } from "@/app/(main)/categories/actions";
import { Button } from "@/components/Button";
import { ActivityForm } from "../ActivityForm";

export default async function NewActivityPage() {
  const categoriesList = await getCategories();
  const categoryOptions = categoriesList.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

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
      <ActivityForm action={submit} categoriesList={categoryOptions} />
      <p className="mt-4">
        <Button href="/activities" variant="ghost" size="md">
          Cancel
        </Button>
      </p>
    </div>
  );
}
