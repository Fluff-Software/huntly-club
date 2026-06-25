-- Huntly app tables — all prefixed huntly_ to avoid collision with Huntly World tables.
-- Auth for Huntly remains Firebase; firebase_user_id (text) is the user reference.
-- All writes go through the Huntly Express API using the Supabase service role key,
-- so RLS is enabled but no additional policies are defined (service role bypasses RLS).
--
-- mongo_id columns are temporary migration scaffolding for traceability.
-- They should be dropped in a follow-up migration once the migration is verified.

-- ─── Locks ────────────────────────────────────────────────────────────────────
-- Created first because quests and quest_groups reference it.

CREATE TABLE huntly_quest_locks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  types            text[]  NOT NULL DEFAULT '{}',  -- ['code'] | ['location'] | both
  permanent_unlock boolean NOT NULL DEFAULT false,
  code             text,                            -- passcode string (if type includes 'code')
  location_lat     float8,
  location_lng     float8,
  location_radius  float8,                          -- metres (if type includes 'location')
  created_at       timestamptz NOT NULL DEFAULT now(),
  mongo_id         text                             -- original MongoDB _id (migration aid)
);

ALTER TABLE huntly_quest_locks ENABLE ROW LEVEL SECURITY;

-- ─── Quest Groups ─────────────────────────────────────────────────────────────

CREATE TABLE huntly_quest_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text    NOT NULL,
  description     text,
  cover_image_url text,                              -- Supabase Storage URL
  display_order   integer,
  tags            text[]  NOT NULL DEFAULT '{}',
  published       boolean NOT NULL DEFAULT false,
  lockable        boolean NOT NULL DEFAULT false,
  lock_id         uuid    REFERENCES huntly_quest_locks(id) ON DELETE SET NULL,
  on_completion   jsonb,                             -- {cta, copy, linkLabel, linkUrl}
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  mongo_id        text
);

CREATE INDEX huntly_quest_groups_published_idx ON huntly_quest_groups (published);
CREATE INDEX huntly_quest_groups_display_order_idx ON huntly_quest_groups (display_order);

ALTER TABLE huntly_quest_groups ENABLE ROW LEVEL SECURITY;

-- ─── Quests ───────────────────────────────────────────────────────────────────

CREATE TABLE huntly_quests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text    NOT NULL,
  description           text,
  cover_image_url       text,
  tile_image_url        text,
  tags                  text[]  NOT NULL DEFAULT '{}',
  published             boolean NOT NULL DEFAULT false,
  is_grouped            boolean NOT NULL DEFAULT false,
  lockable              boolean NOT NULL DEFAULT false,
  group_id              uuid    REFERENCES huntly_quest_groups(id) ON DELETE SET NULL,
  lock_id               uuid    REFERENCES huntly_quest_locks(id) ON DELETE SET NULL,
  attraction_logo_url   text,
  attraction_colour_hex text,
  attraction_name       text,
  attraction_bio        text,
  attraction_image_url  text,
  attraction_fun_facts  text[]  NOT NULL DEFAULT '{}',
  attraction_website    text,
  attraction_address    text,
  attraction_lat        float8,
  attraction_lng        float8,
  on_completion         jsonb,                       -- {cta, copy, linkLabel, linkUrl}
  last_notified         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  mongo_id              text
);

CREATE INDEX huntly_quests_published_idx ON huntly_quests (published);
CREATE INDEX huntly_quests_group_id_idx ON huntly_quests (group_id);
CREATE INDEX huntly_quests_lock_id_idx ON huntly_quests (lock_id);

ALTER TABLE huntly_quests ENABLE ROW LEVEL SECURITY;

-- ─── Quest Items ──────────────────────────────────────────────────────────────
-- Self-contained: findable fields (name, image_url, branded) are merged in directly.
-- The separate findables collection is not migrated — it is fully absorbed here.

CREATE TABLE huntly_quest_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id          uuid    NOT NULL REFERENCES huntly_quests(id) ON DELETE CASCADE,
  name              text    NOT NULL,               -- was findable.name
  image_url         text,                           -- Supabase Storage URL (was findable.imageId)
  branded           boolean NOT NULL DEFAULT false, -- was findable.branded
  description       text,
  hint              text,
  tags              text[]  NOT NULL DEFAULT '{}',
  warning           jsonb,                          -- {message: string, severity?: string}
  lat               float8,
  lng               float8,
  question          text,
  answer            text,
  "order"           integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  mongo_id          text,                           -- original questItem MongoDB _id
  findable_mongo_id text                            -- original findable MongoDB _id (reference only)
);

CREATE INDEX huntly_quest_items_quest_id_idx ON huntly_quest_items (quest_id);
CREATE INDEX huntly_quest_items_order_idx ON huntly_quest_items (quest_id, "order");

ALTER TABLE huntly_quest_items ENABLE ROW LEVEL SECURITY;

-- ─── Badge Rules ──────────────────────────────────────────────────────────────

CREATE TABLE huntly_badge_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id_ref   text    NOT NULL UNIQUE,   -- the badgeId string from old schema
  name           text    NOT NULL,
  description    text,
  image_url      text,
  type           text    NOT NULL,          -- 'item' | 'quest' | 'profile'
  filter         jsonb,                     -- FilterRule object
  property_match text,
  quantity       integer,
  locked         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  mongo_id       text
);

ALTER TABLE huntly_badge_rules ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Multiple profiles per Firebase user (family members etc.)

CREATE TABLE huntly_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_user_id text    NOT NULL,
  name             text    NOT NULL,
  area_code        text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  mongo_id         text
);

CREATE INDEX huntly_profiles_firebase_user_id_idx ON huntly_profiles (firebase_user_id);

ALTER TABLE huntly_profiles ENABLE ROW LEVEL SECURITY;

-- ─── Profile States ───────────────────────────────────────────────────────────

CREATE TABLE huntly_profile_states (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid    NOT NULL UNIQUE REFERENCES huntly_profiles(id) ON DELETE CASCADE,
  all_time_photo_count integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  mongo_id             text
);

ALTER TABLE huntly_profile_states ENABLE ROW LEVEL SECURITY;

-- ─── Quest States ─────────────────────────────────────────────────────────────

CREATE TABLE huntly_quest_states (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid    NOT NULL REFERENCES huntly_profiles(id) ON DELETE CASCADE,
  quest_id    uuid    NOT NULL REFERENCES huntly_quests(id) ON DELETE CASCADE,
  found_items uuid[]  NOT NULL DEFAULT '{}',  -- array of huntly_quest_items.id
  is_current  boolean NOT NULL DEFAULT false,
  complete    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  mongo_id    text
);

CREATE INDEX huntly_quest_states_profile_quest_current_idx
  ON huntly_quest_states (profile_id, quest_id, is_current);
CREATE INDEX huntly_quest_states_profile_complete_idx
  ON huntly_quest_states (profile_id, complete);

ALTER TABLE huntly_quest_states ENABLE ROW LEVEL SECURITY;

-- ─── Badges ───────────────────────────────────────────────────────────────────

CREATE TABLE huntly_badges (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid    NOT NULL REFERENCES huntly_profiles(id) ON DELETE CASCADE,
  badge_rule_id  uuid    REFERENCES huntly_badge_rules(id) ON DELETE SET NULL,
  image_url      text,
  name           text    NOT NULL,
  description    text,
  date_earned_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  mongo_id       text
);

CREATE INDEX huntly_badges_profile_id_idx ON huntly_badges (profile_id);

ALTER TABLE huntly_badges ENABLE ROW LEVEL SECURITY;

-- ─── Activities ───────────────────────────────────────────────────────────────
-- Huntly's per-profile activity log (points, item found events etc.)
-- Not to be confused with Huntly World's activities/missions table.

CREATE TABLE huntly_activities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid    NOT NULL REFERENCES huntly_profiles(id) ON DELETE CASCADE,
  activity_type  text    NOT NULL,
  item_id        uuid,
  points_awarded integer NOT NULL DEFAULT 0,
  date_time      timestamptz NOT NULL DEFAULT now(),
  mongo_id       text
);

CREATE INDEX huntly_activities_profile_id_idx ON huntly_activities (profile_id);
CREATE INDEX huntly_activities_type_idx ON huntly_activities (activity_type);
CREATE INDEX huntly_activities_date_time_idx ON huntly_activities (date_time);

ALTER TABLE huntly_activities ENABLE ROW LEVEL SECURITY;

-- ─── Unlock Logs ──────────────────────────────────────────────────────────────

CREATE TABLE huntly_unlock_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type             text NOT NULL,       -- 'quest' | 'questGroup'
  item_id          uuid NOT NULL,       -- huntly_quests.id or huntly_quest_groups.id
  firebase_user_id text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  mongo_id         text
);

CREATE INDEX huntly_unlock_logs_user_idx ON huntly_unlock_logs (firebase_user_id);
CREATE INDEX huntly_unlock_logs_item_idx ON huntly_unlock_logs (item_id);

ALTER TABLE huntly_unlock_logs ENABLE ROW LEVEL SECURITY;

-- ─── Notification Tokens ──────────────────────────────────────────────────────
-- Expo push tokens. TTL (12-week expiry) is enforced in application code.

CREATE TABLE huntly_notification_tokens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_user_id text NOT NULL,
  token            text NOT NULL UNIQUE,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX huntly_notification_tokens_user_idx ON huntly_notification_tokens (firebase_user_id);

ALTER TABLE huntly_notification_tokens ENABLE ROW LEVEL SECURITY;

-- ─── Settings ─────────────────────────────────────────────────────────────────
-- Single-row table for global Huntly app settings.

CREATE TABLE huntly_settings (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  data       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE huntly_settings ENABLE ROW LEVEL SECURITY;
