-- Same rebuild-ordering fix as 20260505000000, for a second forward
-- reference: 20260529120000_campfire_realtime_scheduled_wait.sql and
-- 20260531120000_campfire_reactions_broadcast_first.sql both touch
-- public.campfire_reactions before it's created by
-- 20260620240000_campfire_reactions.sql. That migration already guards its
-- own CREATE TABLE with IF NOT EXISTS, so this is a safe no-op once it runs.
-- Production already has all of these applied and is unaffected.

CREATE TABLE IF NOT EXISTS public.campfire_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id bigint NOT NULL REFERENCES public.campfire_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  playhead_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_second_utc timestamp GENERATED ALWAYS AS (date_trunc('second', created_at AT TIME ZONE 'UTC')) STORED
);

ALTER TABLE public.campfire_reactions ENABLE ROW LEVEL SECURITY;
