import { CategoriesList } from "./CategoriesList";
import { getCategories } from "./actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const initial = await getCategories();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Categories</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage activity categories. Changes are saved only when you click Save.
        </p>
      </div>
      <CategoriesList initial={initial} />
    </div>
  );
}
