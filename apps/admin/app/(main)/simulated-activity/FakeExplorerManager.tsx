"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import {
  createFakeExplorers,
  deleteFakeExplorer,
  type FakeExplorer,
  type TeamOption,
} from "./actions";

type Props = {
  explorers: FakeExplorer[];
  teams: TeamOption[];
};

export function FakeExplorerManager({ explorers, teams }: Props) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [teamId, setTeamId] = useState<string>("random");
  const [creating, setCreating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const result = await createFakeExplorers(count, teamId === "random" ? null : Number(teamId));
    setCreating(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  async function handleDelete(userId: string, nickname: string) {
    if (!confirm(`Remove fake explorer "${nickname}"? This deletes their history too.`)) return;
    setDeletingUserId(userId);
    setError(null);
    const result = await deleteFakeExplorer(userId);
    setDeletingUserId(null);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-stone-900">Fake explorer pool</h2>
      <p className="mt-1 text-sm text-stone-500">
        Accounts drawn from for the drip. Each one only ever shows up as an explorer name
        and colour, same as a real user.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fake-count" className="text-sm font-medium text-stone-700">
            Count
          </label>
          <input
            id="fake-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fake-team" className="text-sm font-medium text-stone-700">
            Team
          </label>
          <select
            id="fake-team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-huntly-sage focus:outline-none focus:ring-2 focus:ring-huntly-sage/20"
          >
            <option value="random">Spread across teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <Button type="button" variant="primary" size="md" onClick={handleCreate} disabled={creating}>
          {creating ? "Adding…" : "Add fake explorers"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {explorers.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">No fake explorers yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th className="py-2 pr-4 font-medium">Explorer</th>
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 font-medium">Completions</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {explorers.map((e) => (
                <tr key={e.userId} className="border-b border-stone-100">
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: e.colour }}
                        aria-hidden
                      />
                      {e.nickname}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-stone-600">{e.teamName ?? "—"}</td>
                  <td className="py-2 pr-4 text-stone-600">{e.completionCount}</td>
                  <td className="py-2 pr-4 text-right">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(e.userId, e.nickname)}
                      disabled={deletingUserId === e.userId}
                    >
                      {deletingUserId === e.userId ? "Removing…" : "Remove"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
