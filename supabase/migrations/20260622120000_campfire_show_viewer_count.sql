alter table public.campfire_sessions
  add column if not exists show_viewer_count boolean not null default true;

comment on column public.campfire_sessions.show_viewer_count is
  'When true, the mobile app shows the live viewer count during campfire sessions.';
