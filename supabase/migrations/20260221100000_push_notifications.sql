create table "public"."push_tokens" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "expo_push_token" text not null,
  "enabled" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."push_tokens" enable row level security;

create unique index push_tokens_pkey on public.push_tokens using btree (id);
create unique index push_tokens_user_id_expo_push_token_key on public.push_tokens using btree (user_id, expo_push_token);

alter table "public"."push_tokens" add constraint "push_tokens_pkey" primary key using index "push_tokens_pkey";
alter table "public"."push_tokens" add constraint "push_tokens_user_id_expo_push_token_key" unique using index "push_tokens_user_id_expo_push_token_key";
alter table "public"."push_tokens" add constraint "push_tokens_user_id_fkey" foreign key ("user_id") references auth.users("id") on delete cascade not valid;
alter table "public"."push_tokens" validate constraint "push_tokens_user_id_fkey";

create policy "Users can manage own push_tokens"
  on "public"."push_tokens"
  as permissive
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table "public"."notification_prompt_asked" (
  "user_id" uuid not null,
  "asked_at" timestamp with time zone not null default now()
);

alter table "public"."notification_prompt_asked" enable row level security;

alter table "public"."notification_prompt_asked" add constraint "notification_prompt_asked_pkey" primary key ("user_id");
alter table "public"."notification_prompt_asked" add constraint "notification_prompt_asked_user_id_fkey" foreign key ("user_id") references auth.users("id") on delete cascade not valid;
alter table "public"."notification_prompt_asked" validate constraint "notification_prompt_asked_user_id_fkey";

create policy "Users can read own notification_prompt_asked"
  on "public"."notification_prompt_asked"
  as permissive
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own notification_prompt_asked"
  on "public"."notification_prompt_asked"
  as permissive
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own notification_prompt_asked"
  on "public"."notification_prompt_asked"
  as permissive
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table "public"."push_tokens" to authenticated;
grant select, insert, update on table "public"."notification_prompt_asked" to authenticated;
grant select on table "public"."push_tokens" to service_role;
