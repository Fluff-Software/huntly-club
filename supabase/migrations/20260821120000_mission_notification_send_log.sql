-- Log table to make scheduled mission notifications idempotent.
-- Notifications now trigger off individual mission (activity) release_date instead of
-- chapters.unlock_date, since missions have been shipping without new chapter rows.
-- One row per (notify_date, kind) so scheduled jobs can safely retry without spamming.

create table if not exists public.mission_notification_send_log (
  id uuid primary key default gen_random_uuid(),
  notify_date date not null,
  kind text not null check (kind in ('preparation', 'reminder')),
  sent_at timestamp with time zone not null default now()
);

create unique index if not exists mission_notification_send_log_date_kind_key
  on public.mission_notification_send_log (notify_date, kind);

-- Service role needs access (Edge Functions run with service role).
grant select, insert on public.mission_notification_send_log to service_role;
