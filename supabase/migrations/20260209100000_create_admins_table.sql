CREATE TABLE "public"."admins" (
  "user_id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access to admins"
  ON "public"."admins" FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON "public"."admins" TO service_role;

COMMENT ON TABLE "public"."admins" IS 'Users who can access the admin app. Add via: INSERT INTO public.admins (user_id) SELECT id FROM auth.users WHERE email = ''your@email.com'';';
