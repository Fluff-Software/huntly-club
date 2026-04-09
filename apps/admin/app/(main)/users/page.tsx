import { getUsersListPage, getUnverifiedUsers } from "./actions";
import { UsersListWithModal } from "./UsersListWithModal";
import { UnverifiedUsersList } from "./UnverifiedUsersList";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function UsersPage() {
  const [{ users: initialUsers, hasMore: initialHasMore }, unverifiedResult] =
    await Promise.all([
      getUsersListPage(0, PAGE_SIZE),
      getUnverifiedUsers(),
    ]);

  const unverifiedUsers = unverifiedResult.users ?? [];

  return (
    <div className="space-y-10">
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

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Pending verification</h2>
          <p className="mt-1 text-sm text-stone-500">
            Accounts that have signed up but haven&apos;t yet confirmed their email. Use &ldquo;Verify manually&rdquo; to approve them.
          </p>
        </div>

        {unverifiedResult.error ? (
          <p className="rounded-xl border border-dashed border-red-300 bg-red-50/50 py-6 text-center text-sm text-red-600">
            Failed to load unverified accounts: {unverifiedResult.error}
          </p>
        ) : (
          <UnverifiedUsersList initialUsers={unverifiedUsers} />
        )}
      </div>
    </div>
  );
}
