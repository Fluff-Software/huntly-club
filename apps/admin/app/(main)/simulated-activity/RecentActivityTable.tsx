import type { RecentSimulatedCompletion } from "./actions";

const DATE_LOCALE = "en-GB";

type Props = { items: RecentSimulatedCompletion[] };

export function RecentActivityTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
        No simulated activity yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            <th className="px-4 py-2 font-medium">Explorer</th>
            <th className="px-4 py-2 font-medium">Mission</th>
            <th className="px-4 py-2 font-medium">Completed</th>
            <th className="px-4 py-2 font-medium">Photo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-stone-100 last:border-0">
              <td className="px-4 py-2">{item.nickname}</td>
              <td className="px-4 py-2 text-stone-600">{item.activityTitle ?? "—"}</td>
              <td className="px-4 py-2 text-stone-600">
                {new Date(item.completedAt).toLocaleString(DATE_LOCALE)}
              </td>
              <td className="px-4 py-2 text-stone-600">{item.hasPhoto ? "Yes" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
