import Link from "next/link";
import { ActionForm } from "./ActionForm";
import {
  createCollectible,
  createLocation,
  deleteCollectible,
  deleteLocation,
  getExploreAdminData,
  updateCollectible,
  updateLocation,
} from "./actions";

export const dynamic = "force-dynamic";

const RARITY_OPTIONS = ["common", "uncommon", "rare", "epic", "legendary"] as const;

export default async function ExploreAdminPage() {
  const { locations, collectibles } = await getExploreAdminData();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">World Explorer</h1>
        <p className="mt-1 text-sm text-stone-500">
          Seed the always-on world map: locations kids can visit, and the collectible catalog they
          can discover there. Spawn pools (which collectibles appear at which location, and at what
          odds) are managed per-location.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Locations</h2>

        <details className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">
            + Add a location
          </summary>
          <ActionForm action={createLocation} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Location name"
              required
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              name="description"
              placeholder="Description"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
              rows={2}
            />
            <input
              name="latitude"
              type="number"
              step="any"
              placeholder="Latitude"
              required
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              name="longitude"
              type="number"
              step="any"
              placeholder="Longitude"
              required
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <label className="flex flex-col gap-1 text-xs text-stone-500">
              Check-in radius (metres, 10-500)
              <input
                name="radius_meters"
                type="number"
                min={10}
                max={500}
                defaultValue={50}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-500">
              Image
              <input name="image_file" type="file" accept="image/*" className="text-sm" />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf sm:col-span-2"
            >
              Create location
            </button>
          </ActionForm>
        </details>

        <div className="space-y-3">
          {locations.map((location) => (
            <div key={location.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <ActionForm action={updateLocation} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={location.id} />
                <input
                  name="name"
                  defaultValue={location.name}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
                />
                <textarea
                  name="description"
                  defaultValue={location.description ?? ""}
                  rows={2}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
                />
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue={location.latitude}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue={location.longitude}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <label className="flex flex-col gap-1 text-xs text-stone-500">
                  Radius (m)
                  <input
                    name="radius_meters"
                    type="number"
                    min={10}
                    max={500}
                    defaultValue={location.radius_meters}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-stone-500">
                  Replace image
                  <input name="image_file" type="file" accept="image/*" className="text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" name="is_active" defaultChecked={location.is_active} />
                  Active
                </label>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-huntly-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-huntly-leaf"
                  >
                    Save
                  </button>
                  <Link
                    href={`/explore/locations/${location.id}`}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Manage spawn pool
                  </Link>
                </div>
              </ActionForm>
              <form action={deleteLocation} className="mt-2">
                <input type="hidden" name="id" value={location.id} />
                <button type="submit" className="text-xs font-medium text-red-700 hover:underline">
                  Delete location
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Collectibles</h2>

        <details className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">
            + Add a collectible
          </summary>
          <ActionForm action={createCollectible} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Collectible name"
              required
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              name="description"
              placeholder="Description"
              rows={2}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              name="flavor_text"
              placeholder="Flavor text (shown on the reveal screen)"
              rows={2}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <select name="rarity" className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
              {RARITY_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              name="image_url"
              placeholder="Image URL (or upload a file below)"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <label className="flex flex-col gap-1 text-xs text-stone-500 sm:col-span-2">
              Image upload
              <input name="image_file" type="file" accept="image/*" className="text-sm" />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-lg bg-huntly-forest px-4 py-2 text-sm font-medium text-white hover:bg-huntly-leaf sm:col-span-2"
            >
              Create collectible
            </button>
          </ActionForm>
        </details>

        <div className="grid gap-3 sm:grid-cols-2">
          {collectibles.map((collectible) => (
            <div key={collectible.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <ActionForm action={updateCollectible} className="space-y-2">
                <input type="hidden" name="id" value={collectible.id} />
                <input
                  name="name"
                  defaultValue={collectible.name}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="description"
                  defaultValue={collectible.description ?? ""}
                  rows={2}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="flavor_text"
                  defaultValue={collectible.flavor_text ?? ""}
                  rows={2}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <select
                  name="rarity"
                  defaultValue={collectible.rarity}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {RARITY_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  name="image_url"
                  defaultValue={collectible.image_url}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <input name="image_file" type="file" accept="image/*" className="text-sm" />
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" name="is_active" defaultChecked={collectible.is_active} />
                  Active
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-huntly-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-huntly-leaf"
                >
                  Save
                </button>
              </ActionForm>
              <form action={deleteCollectible} className="mt-2">
                <input type="hidden" name="id" value={collectible.id} />
                <button type="submit" className="text-xs font-medium text-red-700 hover:underline">
                  Delete collectible
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
