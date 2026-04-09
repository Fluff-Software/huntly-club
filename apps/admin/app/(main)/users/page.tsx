import { getUsersListPage, getUnverifiedUsers } from "./actions";
import { UsersTabs } from "./UsersTabs";

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
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">Users</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage app users and accounts pending email verification.
          </p>
        </div>
      </div>

      <UsersTabs
        initialUsers={initialUsers}
        initialHasMore={initialHasMore}
        unverifiedUsers={unverifiedUsers}
        unverifiedError={unverifiedResult.error}
      />
    </div>
  );
}
