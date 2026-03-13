-- Push tokens: unique per device (device_id), no user_id.
-- Drop existing table and recreate so we can change primary key and remove user_id.

drop policy if exists "Users can manage own push_tokens" on "public"."push_tokens";
alter table "public"."push_tokens" drop constraint if exists "push_tokens_user_id_fkey";
alter table "public"."push_tokens" drop constraint if exists "push_tokens_user_id_expo_push_token_key";

alter table "public"."push_tokens"
  drop column "user_id";

alter table "public"."push_tokens"
  add column "device_id" text;

-- Backfill device_id for any existing rows so we can set not null (use id so each row stays unique).
update "public"."push_tokens"
set device_id = id::text
where device_id is null;

alter table "public"."push_tokens"
  alter column "device_id" set not null;

create unique index push_tokens_device_id_key on public.push_tokens using btree (device_id);
alter table "public"."push_tokens" add constraint "push_tokens_device_id_key" unique using index "push_tokens_device_id_key";

-- RPC: get push enabled for a device (returns true only if a row exists and enabled is true).
create or replace function public.get_push_enabled(p_device_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from push_tokens where device_id = p_device_id limit 1),
    false
  );
$$;

-- RPC: set push enabled for a device. When enabling: upsert row with token and enabled true. When disabling: update enabled to false if row exists.
create or replace function public.set_push_enabled(p_device_id text, p_enabled boolean, p_expo_push_token text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_enabled then
    if p_expo_push_token is null or p_expo_push_token = '' then
      raise exception 'expo_push_token is required when enabling push';
    end if;
    insert into push_tokens (device_id, expo_push_token, enabled, updated_at)
    values (p_device_id, p_expo_push_token, true, now())
    on conflict (device_id) do update set
      expo_push_token = excluded.expo_push_token,
      enabled = true,
      updated_at = excluded.updated_at;
  else
    update push_tokens
    set enabled = false, updated_at = now()
    where device_id = p_device_id;
  end if;
end;
$$;

-- Only allow authenticated users to call the RPCs; revoke direct DML so they must use RPCs.
revoke insert, update, delete on table "public"."push_tokens" from authenticated;
grant execute on function public.get_push_enabled(text) to authenticated;
grant execute on function public.set_push_enabled(text, boolean, text) to authenticated;

-- Authenticated can no longer select push_tokens directly (they use get_push_enabled). service_role still has select for send-chapter-push.
revoke select on table "public"."push_tokens" from authenticated;
