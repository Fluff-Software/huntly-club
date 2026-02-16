import Image from "next/image";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { ApprovedDeniedGallery } from "./ApprovedDeniedGallery";

const STATUS_FOR_REVIEW = 0;
const STATUS_APPROVED = 1;
const STATUS_DENIED = 2;

const TABS = [
  { value: "for-review", label: "For review", status: STATUS_FOR_REVIEW },
  { value: "approved", label: "Approved", status: STATUS_APPROVED },
  { value: "denied", label: "Denied", status: STATUS_DENIED },
] as const;

type PhotoRow = {
  photo_id: number;
  photo_url: string;
  uploaded_at: string;
  activity_id: number | null;
  profile_id: number;
  activities: { title: string | null } | null;
  profiles: { nickname: string | null } | null;
};

async function getPhotosByStatus(status: number): Promise<PhotoRow[]> {
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
    .eq("status", status)
    .order("uploaded_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PhotoRow[];
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab =
    TABS.find((t) => t.value === tabParam)?.value ?? "for-review";
  const currentTabConfig = TABS.find((t) => t.value === tab)!;
  const photos = await getPhotosByStatus(currentTabConfig.status);
  const isForReview = tab === "for-review";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Photos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Activity photos by status. Use the review flow to approve or deny.
          </p>
        </div>
        {isForReview && (
          <Button href="/photos/review" size="md" className="sm:shrink-0">
            Review
          </Button>
        )}
      </div>

      <nav
        className="mb-6 border-b border-stone-200"
        aria-label="Photo status tabs"
      >
        <ul className="flex gap-1">
          {TABS.map((t) => (
            <li key={t.value}>
              <Link
                href={`/photos?tab=${t.value}`}
                className={`block border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 ${
                  tab === t.value
                    ? "border-huntly-forest text-huntly-forest"
                    : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
                }`}
                aria-current={tab === t.value ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No photos in this tab.
        </p>
      ) : isForReview ? (
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          aria-label={`Photos: ${currentTabConfig.label}`}
        >
          {photos.map((photo) => (
            <Link
              key={photo.photo_id}
              href={`/photos/review?photo=${photo.photo_id}`}
              className="block focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 focus:ring-offset-white rounded-xl"
            >
              <figure className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="relative aspect-square bg-stone-100">
                  <Image
                    src={photo.photo_url}
                    alt="Activity submission"
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="border-t border-stone-100 px-3 py-2 text-xs text-stone-600">
                  <span className="font-medium text-stone-800 truncate block">
                    {photo.activities?.title ?? "—"}
                  </span>
                  <time
                    dateTime={photo.uploaded_at}
                    className="mt-0.5 block text-stone-500"
                  >
                    {new Date(photo.uploaded_at).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                </figcaption>
              </figure>
            </Link>
          ))}
        </div>
      ) : (
        <ApprovedDeniedGallery
          photos={photos}
          variant={tab === "approved" ? "approved" : "denied"}
        />
      )}
    </div>
  );
}
