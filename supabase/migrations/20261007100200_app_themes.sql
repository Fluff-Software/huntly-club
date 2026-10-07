-- Seasonal app themes (e.g. Halloween).
--
-- This table only *schedules* a theme: which one is live and when. The
-- palette for each slug ships in the app (apps/mobile/constants/appThemes.ts),
-- so a slug with no palette in the installed build is simply ignored. The app
-- also checks the window locally, so it reverts to normal on its own when
-- ends_at passes. Managed from the admin app.

CREATE TABLE IF NOT EXISTS public.app_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  -- Half-open window: [starts_at, ends_at).
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_themes_slug_unique UNIQUE (slug),
  CONSTRAINT app_themes_window_check CHECK (ends_at > starts_at)
);

COMMENT ON TABLE public.app_themes IS
  'Schedules for seasonal app themes. Palettes live in the app, keyed by slug. Writes only via the admin app (service role).';

ALTER TABLE public.app_themes ENABLE ROW LEVEL SECURITY;

-- Not secret, and the sign-in screens are themed before the user is
-- authenticated, so anon can read it too.
DROP POLICY IF EXISTS "Anyone can view app themes" ON public.app_themes;
CREATE POLICY "Anyone can view app themes"
  ON public.app_themes
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.app_themes TO anon, authenticated;
GRANT ALL ON public.app_themes TO service_role;

-- Halloween 2026: same window as the Halloween pack (7 Oct -> end of 5 Nov, UK time).
INSERT INTO public.app_themes (slug, name, starts_at, ends_at, is_active)
VALUES (
  'halloween',
  'Halloween',
  '2026-10-07 00:00:00+01',
  '2026-11-06 00:00:00+00',
  true
)
ON CONFLICT (slug) DO NOTHING;
