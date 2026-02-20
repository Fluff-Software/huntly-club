-- Change hints and tips from text to text[] (array of text).
-- Migrate existing bullet/newline text into arrays (split on newline, strip "• ").
-- Use add/update/drop/rename because USING cannot contain subqueries.

ALTER TABLE "public"."activities"
  ADD COLUMN "hints_new" text[],
  ADD COLUMN "tips_new" text[];

UPDATE "public"."activities"
SET
  hints_new = CASE
    WHEN hints IS NULL THEN NULL
    ELSE (
      SELECT coalesce(array_agg(t), '{}')
      FROM (
        SELECT trim(regexp_replace(x, '^\s*•\s*', '')) AS t
        FROM unnest(string_to_array(hints, E'\n')) AS x
      ) sub
      WHERE t != ''
    )
  END,
  tips_new = CASE
    WHEN tips IS NULL THEN NULL
    ELSE (
      SELECT coalesce(array_agg(t), '{}')
      FROM (
        SELECT trim(regexp_replace(x, '^\s*•\s*', '')) AS t
        FROM unnest(string_to_array(tips, E'\n')) AS x
      ) sub
      WHERE t != ''
    )
  END;

ALTER TABLE "public"."activities"
  DROP COLUMN "hints",
  DROP COLUMN "tips";

ALTER TABLE "public"."activities" RENAME COLUMN "hints_new" TO "hints";
ALTER TABLE "public"."activities" RENAME COLUMN "tips_new" TO "tips";
