import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "../../ActionForm";
import { addToSpawnPool, getSpawnPoolData, removeFromSpawnPool, updateSpawnWeight } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SpawnPoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationId = Number.parseInt(id, 10);
  if (!locationId) notFound();

  const { location, collectibles, pool } = await getSpawnPoolData(locationId);
  if (!location) notFound();

  const totalWeight = pool.reduce((sum, row) => sum + row.weight, 0);
  const poolCollectibleIds = new Set(pool.map((row) => row.collectible_id));
  const availableToAdd = collectibles.filter((c) => !poolCollectibleIds.has(c.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/explore" className="text-sm text-stone-500 hover:underline">
          ← Back to World Explorer
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{location.name}: spawn pool</h1>
        <p className="mt-1 text-sm text-stone-500">
          Choose which collectibles can be found here and their relative odds. This pool is never
          shown to players — the drop is drawn server-side to keep the surprise.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-2.5">Collectible</th>
              <th className="px-4 py-2.5">Rarity</th>
              <th className="px-4 py-2.5">Weight</th>
              <th className="px-4 py-2.5">Drop %</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {pool.map((row) => {
              const collectible = collectibles.find((c) => c.id === row.collectible_id);
              const dropPercent = totalWeight > 0 ? ((row.weight / totalWeight) * 100).toFixed(1) : "0.0";
              return (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 font-medium text-stone-900">{collectible?.name ?? `#${row.collectible_id}`}</td>
                  <td className="px-4 py-2.5 text-stone-600">{collectible?.rarity ?? "-"}</td>
                  <td className="px-4 py-2.5">
                    <ActionForm action={updateSpawnWeight} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="location_id" value={locationId} />
                      <input
                        name="weight"
                        type="number"
                        min={1}
                        defaultValue={row.weight}
                        className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm"
                      />
                      <button type="submit" className="rounded-lg border border-stone-300 px-2 py-1 text-xs hover:bg-stone-50">
                        Update
                      </button>
                    </ActionForm>
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{dropPercent}%</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={removeFromSpawnPool}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="location_id" value={locationId} />
                      <button type="submit" className="text-xs font-medium text-red-700 hover:underline">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {pool.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-400">
                  No collectibles configured for this location yet — check-ins will fail until you
                  add at least one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {availableToAdd.length > 0 && (
        <ActionForm action={addToSpawnPool} className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="location_id" value={locationId} />
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Collectible
            <select name="collectible_id" className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
              {availableToAdd.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.rarity})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Weight
            <input
              name="weight"
              type="number"
              min={1}
              defaultValue={100}
              className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf">
            Add to pool
          </button>
        </ActionForm>
      )}
    </div>
  );
}
