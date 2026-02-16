export default function PhotosLoading() {
  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="h-8 w-32 animate-pulse rounded bg-stone-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="h-10 w-24 animate-pulse rounded-lg bg-stone-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white"
          >
            <div className="aspect-square animate-pulse bg-stone-100" />
            <div className="space-y-1 border-t border-stone-100 px-3 py-2">
              <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
