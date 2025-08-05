create policy "Enable all for users based on user_id"
on "public"."profiles"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Enable read access for all users"
on "public"."teams"
as permissive
for select
to public
using (true);



