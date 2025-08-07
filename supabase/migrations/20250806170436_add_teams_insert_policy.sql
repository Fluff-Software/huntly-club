-- Add insert policy for teams table to allow seeding
create policy "Enable insert access for all users"
on "public"."teams"
as permissive
for insert
to public
with check (true);