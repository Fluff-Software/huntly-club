import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isoToLondonLocal } from "@/lib/london-time";
import { AppThemeForm, type AppThemeInitial } from "./AppThemeForm";

export const dynamic = "force-dynamic";

async function getThemes(): Promise<AppThemeInitial[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("app_themes")
    .select("id, slug, name, starts_at, ends_at, is_active")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);

  const now = Date.now();
  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    startsAtLocal: isoToLondonLocal(t.starts_at),
    endsAtLocal: isoToLondonLocal(t.ends_at),
    isActive: t.is_active,
    live:
      t.is_active &&
      now >= new Date(t.starts_at).getTime() &&
      now < new Date(t.ends_at).getTime(),
  }));
}

export default async function AppThemesPage() {
  const themes = await getThemes();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">App Themes</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-500">
          Seasonal looks for the whole app (e.g. Halloween). Set when a theme is live; the
          app returns to its normal colours by itself when the end date passes. The
          colours themselves ship with the app.
        </p>
      </div>

      {themes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No themes yet.
        </p>
      ) : (
        <div className="space-y-6">
          {themes.map((theme) => (
            <AppThemeForm key={theme.id} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}
