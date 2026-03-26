-- Experience-driven missions: intro, prep checklist, steps, debrief fields

-- activities: intro and debrief config
ALTER TABLE "public"."activities"
  ADD COLUMN IF NOT EXISTS "intro_urgent_message" text,
  ADD COLUMN IF NOT EXISTS "intro_character_name" text,
  ADD COLUMN IF NOT EXISTS "intro_character_avatar_url" text,
  ADD COLUMN IF NOT EXISTS "intro_dialogue" text,
  ADD COLUMN IF NOT EXISTS "estimated_duration" text,
  ADD COLUMN IF NOT EXISTS "optional_items" text,
  ADD COLUMN IF NOT EXISTS "prep_checklist" jsonb,
  ADD COLUMN IF NOT EXISTS "steps" jsonb,
  ADD COLUMN IF NOT EXISTS "debrief_heading" text,
  ADD COLUMN IF NOT EXISTS "debrief_photo_label" text,
  ADD COLUMN IF NOT EXISTS "debrief_question_1" text,
  ADD COLUMN IF NOT EXISTS "debrief_question_2" text;

-- user_activity_progress: debrief answers
ALTER TABLE "public"."user_activity_progress"
  ADD COLUMN IF NOT EXISTS "debrief_answer_1" text,
  ADD COLUMN IF NOT EXISTS "debrief_answer_2" text;
