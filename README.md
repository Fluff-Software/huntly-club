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

2. **⚠️ CRITICAL: Configure Authentication URLs** (otherwise confirmation emails will have localhost links):
   - Go to **Authentication → URL Configuration** in your Supabase dashboard
   - Set **Site URL** to your app's deep link URL: `huntlyclub://auth/confirm`
   - Add `huntlyclub://auth/confirm` to **Redirect URLs**
   - This ensures confirmation emails contain the correct deep link that opens your mobile app
   
   > **Why this matters:** Supabase generates email confirmation links using the Site URL. If left as default (localhost), users will receive emails with localhost links that don't work in production. The Site URL must be the deep link scheme that opens your mobile app.

3. (Optional) Seed data once via the dashboard SQL editor or a one-off script.

### 2. GitHub Actions (migrations + functions)

The workflow `.github/workflows/supabase-deploy.yml` runs on push to `main` when `supabase/migrations` or `supabase/functions` change (or via **Actions → Supabase (migrations + functions) → Run workflow**). It links the project, runs `supabase db push`, and deploys all edge functions.

Add these **GitHub repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|------------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase dashboard](https://supabase.com/dashboard/account/tokens) → Access Tokens → Generate |
| `SUPABASE_PROJECT_REF` | Project ref from the project URL (e.g. `abcdefghijklmnop`) |
| `SUPABASE_DB_PASSWORD` | Project **Settings → Database → Database password** (the one you set when creating the project) |

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

Your local `.env` stays for local dev (e.g. ngrok + local anon key). Hosted is handled by GitHub Actions (GH secrets) and EAS builds (EAS secrets). Use the **production** profile when you are ready for store builds.

## Troubleshooting

### Confirmation emails contain localhost links

**Cause:** The Supabase project's Site URL is not configured correctly in the hosted environment.

**Solution:**
1. Log in to your Supabase dashboard at [supabase.com](https://supabase.com)
2. Select your project
3. Go to **Authentication → URL Configuration**
4. Set **Site URL** to: `huntlyclub://auth/confirm`
5. Ensure `huntlyclub://auth/confirm` is in the **Redirect URLs** list
6. Click **Save**

**Important notes:**
- The `supabase/config.toml` file in this repository only affects local development
- Hosted Supabase projects have separate configuration in the Supabase dashboard
- Email templates use the Site URL from the dashboard, not from code
- Changes take effect immediately after saving in the dashboard

### Preview builds not connecting to hosted Supabase

**Solution:** Verify EAS secrets are set correctly:
```bash
eas secret:list --scope project
```
You should see `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. If missing, set them:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT_REF.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
