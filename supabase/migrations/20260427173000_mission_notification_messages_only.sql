-- Missions (activities): simplify notification fields.
-- Before:
--  - prep_notif_title
--  - prep_notif_description
--  - remind_notif_title
--  - remind_notif_description
-- After:
--  - preparation_message
--  - reminder_message
--
-- We preserve existing message content by renaming the *_description columns.

ALTER TABLE "public"."activities"
  DROP COLUMN IF EXISTS "prep_notif_title",
  DROP COLUMN IF EXISTS "remind_notif_title";

ALTER TABLE "public"."activities"
  RENAME COLUMN "prep_notif_description" TO "preparation_message";

ALTER TABLE "public"."activities"
  RENAME COLUMN "remind_notif_description" TO "reminder_message";

