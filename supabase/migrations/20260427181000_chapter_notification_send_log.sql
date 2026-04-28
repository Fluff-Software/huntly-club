-- Log table to make scheduled chapter notifications idempotent.
-- We store one row per (chapter_id, kind) so scheduled jobs can safely retry without spamming.

create table if not exists public.chapter_notification_send_log (
  id uuid primary key default gen_random_uuid(),
  chapter_id integer not null references public.chapters(id) on delete cascade,
  kind text not null check (kind in ('preparation', 'reminder')),
  sent_at timestamp with time zone not null default now()
);

create unique index if not exists chapter_notification_send_log_chapter_kind_key
  on public.chapter_notification_send_log (chapter_id, kind);

-- Service role needs access (Edge Functions run with service role).
grant select, insert on public.chapter_notification_send_log to service_role;

