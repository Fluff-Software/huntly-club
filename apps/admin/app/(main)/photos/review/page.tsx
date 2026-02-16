import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PhotoReviewCards, type ReviewPhoto } from "../PhotoReviewCards";
import { Button } from "@/components/Button";

const STATUS_FOR_REVIEW = 0;

async function getForReviewPhotos(): Promise<ReviewPhoto[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_activity_photos")
    .select(
      `
      photo_id,
      photo_url,
      uploaded_at,
      activity_id,
      profile_id,
      activities ( title ),
      profiles ( nickname )
    `
    )
    .eq("status", STATUS_FOR_REVIEW)
    .order("uploaded_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewPhoto[];
}

function reorderWithPhotoFirst(photos: ReviewPhoto[], photoId: number | null): ReviewPhoto[] {
  if (photoId == null) return photos;
  const index = photos.findIndex((p) => p.photo_id === photoId);
  if (index <= 0) return photos;
  const copy = [...photos];
  const [picked] = copy.splice(index, 1);
  return [picked, ...copy];
}

export default async function PhotoReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string }>;
}) {
  const { photo: photoParam } = await searchParams;
  const photoId = photoParam != null ? parseInt(photoParam, 10) : null;
  const rawPhotos = await getForReviewPhotos();

  if (rawPhotos.length === 0) {
    redirect("/photos");
  }

  const photos = reorderWithPhotoFirst(
    rawPhotos,
    Number.isNaN(photoId) ? null : photoId
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Review photos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Approve or deny each photo. Use the buttons or arrow keys.
          </p>
        </div>
        <Button href="/photos" variant="secondary" size="md" className="sm:shrink-0">
          Back to Photos
        </Button>
      </div>

      <PhotoReviewCards initialPhotos={photos} />
    </div>
  );
}
