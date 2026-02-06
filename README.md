# Welcome to Huntly Club 👋

This is an Expo project, which uses Supabase for the back end.

## Get started with local development

1. Run Supabase locally

   ```bash
   supabase start
   ```

2. Copy `.env.example` to `.env` and fill in values from `supabase status` (local) or your Supabase project (hosted).

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
   supabase db diff --local --file <a_descriptive_name>
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

## Hosted Supabase and EAS device builds

You can keep your local `.env` for local dev only. Hosted Supabase is updated by GitHub Actions (using GitHub secrets); the installed app gets the hosted URL/keys from EAS secrets at build time.

### 1. One-time hosted setup

1. Create a project at [supabase.com](https://supabase.com). Note the **project ref** from the dashboard URL (`https://supabase.com/dashboard/project/<project-ref>`).
2. **Authentication → URL configuration**: add `huntlyclub://auth/confirm` to **Redirect URLs**.
3. (Optional) Seed data once via the dashboard SQL editor or a one-off script.

### 2. GitHub Actions (migrations + functions)

The workflow `.github/workflows/supabase-deploy.yml` runs on push to `main` when `supabase/migrations` or `supabase/functions` change (or via **Actions → Supabase (migrations + functions) → Run workflow**). It links the project, runs `supabase db push`, and deploys all edge functions.

Add these **GitHub repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|------------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase dashboard](https://supabase.com/dashboard/account/tokens) → Access Tokens → Generate |
| `SUPABASE_PROJECT_REF` | Project ref from the project URL (e.g. `abcdefghijklmnop`) |
| `SUPABASE_DB_PASSWORD` | Project **Settings → Database → Database password** (the one you set when creating the project) |
| `EXPO_TOKEN` | [Expo dashboard](https://expo.dev/accounts/[account]/settings/access-tokens) → Access Tokens → Create Token |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Your EAS project ID from `app.config.ts` or run `eas init` locally to generate one |
| `EXPO_PUBLIC_OWNER` | Your Expo account username or organization name (e.g. `fluffsoftware`) |

After that you do not need to run migrations or deploy functions locally for the hosted project, and you do not need hosted URL/keys in your local `.env`.

### 3. EAS builds for devices (internal install)

1. Set EAS secrets so the built app talks to the hosted backend (EAS does not use your local `.env`):
   ```bash
   eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT_REF.supabase.co" --scope project
   eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project
   ```
2. Register devices:
   ```bash
   eas device:create
   ```
3. Build an installable app using the **preview** profile (internal distribution):
   ```bash
   eas build --profile preview --platform all
   ```
   Or use `make create-preview-build` for the same. Install the built app on registered devices via the link EAS provides.

#### Triggering builds from GitHub Actions

Instead of running builds locally, you can trigger EAS preview builds from GitHub Actions:

1. Go to **Actions → EAS Preview Build → Run workflow**
2. Select the platform to build (all, ios, or android)
3. Click **Run workflow**

The workflow will trigger the build and exit without waiting for completion. Check [Expo dashboard](https://expo.dev) for build status and download links.

Your local `.env` stays for local dev (e.g. ngrok + local anon key). Hosted is handled by GitHub Actions (GH secrets) and EAS builds (EAS secrets). Use the **production** profile when you are ready for store builds.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
