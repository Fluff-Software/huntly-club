-- Grandfather existing users into full app access ahead of the RevenueCat subscription
-- requirement: add a subscription_exempt flag, backfill it true for everyone who already
-- has an account, and default it false so all new signups going forward will require an
-- active subscription.
alter table "public"."user_data"
  add column "subscription_exempt" boolean not null default false;

comment on column "public"."user_data"."subscription_exempt" is
  'True for accounts that existed before the subscription requirement launched; they keep full access without needing to subscribe. Set once at rollout (or by support/admin) - never client-writable.';

update "public"."user_data" set "subscription_exempt" = true;

-- Column-level grants: authenticated users can read their own subscription_exempt (via the
-- existing "Users can read own user_data" row policy) but must not be able to set it
-- themselves, so replace the blanket table grants with explicit column lists that omit it.
revoke update, insert on table "public"."user_data" from "authenticated";

grant insert ("user_id", "team", "weekly_email", "last_seen_season_id", "start_mission_step")
  on table "public"."user_data" to "authenticated";

grant update ("team", "weekly_email", "last_seen_season_id", "start_mission_step")
  on table "public"."user_data" to "authenticated";
