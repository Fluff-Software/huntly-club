import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Button } from "@/components/Button";
import { AddAdminForm } from "./AddAdminForm";
import { RemoveAdminButton } from "./RemoveAdminButton";

async function getAdminsWithEmails() {
  const supabase = createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from("admins")
    .select("user_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const withEmail = await Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.auth.admin.getUserById(row.user_id);
      return {
        user_id: row.user_id,
        email: data?.user?.email ?? null,
        created_at: row.created_at,
      };
    })
  );
  return withEmail;
}

export default async function AdminsPage() {
  const admins = await getAdminsWithEmails();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Admins</h1>
          <p className="mt-1 text-sm text-stone-500">
            Users who can sign in to the admin app. Add by email (they must
            exist in Auth first).
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-stone-700">Add admin</h2>
        <AddAdminForm />
      </div>

      {admins.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No admins yet. Add one above or via SQL (see migration comment).
        </p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {admins.map((a) => (
              <article
                key={a.user_id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-500">Email</p>
                    <p className="mt-0.5 break-all text-sm font-medium text-stone-900">
                      {a.email ?? a.user_id}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Added {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <RemoveAdminButton userId={a.user_id} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm sm:block">
            <table className="min-w-full divide-y divide-stone-200">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
                  >
                    Added
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {admins.map((a) => (
                  <tr key={a.user_id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-stone-900">
                      {a.email ?? a.user_id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                      {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <RemoveAdminButton userId={a.user_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
