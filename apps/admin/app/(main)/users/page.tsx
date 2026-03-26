import { getUsersListPage } from "./actions";
import { UsersListWithModal } from "./UsersListWithModal";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function UsersPage() {
  const { users: initialUsers, hasMore: initialHasMore } = await getUsersListPage(
    0,
    PAGE_SIZE
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Users</h1>
          <p className="mt-1 text-sm text-stone-500">
            App users who have at least one explorer profile. Click a row to view full details, profiles, and uploaded images.
          </p>
        </div>
      </div>

      {initialUsers.length === 0 && !initialHasMore ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No users with profiles yet.
        </p>
      ) : (
        <UsersListWithModal
          initialUsers={initialUsers}
          initialHasMore={initialHasMore}
        />
      )}
    </div>
  );
}
