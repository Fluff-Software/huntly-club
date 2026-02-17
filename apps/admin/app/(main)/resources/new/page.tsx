import { redirect } from "next/navigation";
import { createResource } from "../actions";
import { Button } from "@/components/Button";
import { ResourceForm } from "../ResourceForm";

export default function NewResourcePage() {
  async function submit(formData: FormData) {
    "use server";
    const result = await createResource({}, formData);
    if (result.error) return result;
    redirect("/resources");
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        New resource
      </h1>
      <ResourceForm action={submit} />
      <p className="mt-4">
        <Button href="/resources" variant="ghost" size="md">
          Cancel
        </Button>
      </p>
    </div>
  );
}
