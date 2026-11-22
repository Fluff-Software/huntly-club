-- Intention setting at sign-up (Retention and Onboarding Changes, Oct 2026).
-- One row per account: when the family plans their first adventure, their weekly
-- slot, and which reminders they want. Day and time only — no location is ever
-- stored with a plan. Rows go with the account (FK cascade), so the existing
-- deletion flow also removes booked slots.

create table "public"."family_adventure_plans" (
  "user_id" uuid not null,
  "first_slot_choice" text,
  "first_adventure_at" timestamp with time zone,
  "weekly_days" smallint[] not null default '{}',
  "weekly_time" time without time zone,
  "quiet_start" time without time zone not null default '20:00',
  "quiet_end" time without time zone not null default '07:00',
  "notify_booked_slot" boolean not null default true,
  "notify_new_mission" boolean not null default true,
  "notify_team_moments" boolean not null default false,
  "notify_lapsed" boolean not null default true,
  "reschedule_prompted_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "family_adventure_plans_pkey" primary key ("user_id"),
  constraint "family_adventure_plans_user_id_fkey" foreign key ("user_id") references auth.users("id") on delete cascade,
  constraint "family_adventure_plans_first_slot_choice_check" check (
    "first_slot_choice" is null or "first_slot_choice" in (
      'tomorrow_before_school', 'school_run', 'after_school', 'saturday_morning', 'sunday', 'today_afternoon', 'custom', 'tonight_starter', 'skipped'
    )
  ),
  constraint "family_adventure_plans_weekly_days_check" check ("weekly_days" <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

comment on table "public"."family_adventure_plans" is
  'Booked adventure slots and reminder preferences per account. Used for local slot reminders and slot-uptake metrics.';

alter table "public"."family_adventure_plans" enable row level security;

create policy "Users can read own adventure plan"
  on "public"."family_adventure_plans" as permissive for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own adventure plan"
  on "public"."family_adventure_plans" as permissive for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own adventure plan"
  on "public"."family_adventure_plans" as permissive for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own adventure plan"
  on "public"."family_adventure_plans" as permissive for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table "public"."family_adventure_plans" to "authenticated";
grant all on table "public"."family_adventure_plans" to "service_role";

create or replace function public.touch_family_adventure_plans_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger family_adventure_plans_touch_updated_at
  before update on public.family_adventure_plans
  for each row execute function public.touch_family_adventure_plans_updated_at();
