# Welcome to Huntly Club 👋

This is an Expo project, which uses Supabase for the back end.

## Get started with local development

1. Run Supabase locally

   ```bash
   supabase start
   ```

2. Set up a .env file. You'll need to add details from your fresh running supabase project.

3. Install a development build on your device/simulator.

4. Start the app

   ```bash
    npx expo start
   ```

## Database

The core flow that we use to affect changes to the database and the associated types are:

1. Make changes to the database using the Supabase UI.

2. Create a migration file using

   ```bash
   supabase db diff --local
   ```

3. If needed, use this command to rebuild your database from the migrations:

   ```bash
   supabase db reset
   ```

4. Recreate types using

   ```bash
   supabase gen types typescript --local > models/supabase.ts
   ```

5. Set up initial data:

   ```bash
   docker exec -i supabase_db_huntly-club psql -U postgres -d postgres < supabase/seed/initial_data.sql
   ```


## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
