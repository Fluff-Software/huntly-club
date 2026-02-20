-- Change hints and tips from text to text[] (array of text).
-- Migrate existing bullet/newline text into arrays (split on newline, strip "• ").

ALTER TABLE "public"."activities"
  ALTER COLUMN "hints" TYPE text[] USING (
    CASE
      WHEN hints IS NULL THEN NULL
      ELSE (
        SELECT coalesce(array_agg(t), '{}')
        FROM (
          SELECT trim(regexp_replace(x, '^\s*•\s*', '')) AS t
          FROM unnest(string_to_array(hints, E'\n')) AS x
        ) sub
        WHERE t != ''
      )
    END
  ),
  ALTER COLUMN "tips" TYPE text[] USING (
    CASE
      WHEN tips IS NULL THEN NULL
      ELSE (
        SELECT coalesce(array_agg(t), '{}')
        FROM (
          SELECT trim(regexp_replace(x, '^\s*•\s*', '')) AS t
          FROM unnest(string_to_array(tips, E'\n')) AS x
        ) sub
        WHERE t != ''
      )
    END
  );
