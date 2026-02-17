import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { updateResource } from "../../actions";
import { Button } from "@/components/Button";
import { ResourceForm } from "../../ResourceForm";

async function getResource(id: number) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("parent_resources")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resourceId = parseInt(id, 10);
  if (Number.isNaN(resourceId)) notFound();

  const resource = await getResource(resourceId);
  if (!resource) notFound();

  async function submit(formData: FormData) {
    "use server";
    const result = await updateResource(resourceId, {}, formData);
    if (!result.error) redirect("/resources");
    return result;
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">
        Edit resource: {resource.title}
      </h1>
      <ResourceForm
        action={submit}
        initial={{
          title: resource.title,
          description: resource.description,
          file_url: resource.file_url,
          sort_order: resource.sort_order ?? 0,
          category: resource.category,
        }}
      />
      <p className="mt-4">
        <Button href="/resources" variant="ghost" size="md">
          Back to resources
        </Button>
      </p>
    </div>
  );
}
