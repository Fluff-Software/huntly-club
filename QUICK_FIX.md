# Quick Fix: Email Confirmation Localhost Links

## Problem
Users in the hosted (preview) app receive confirmation emails with links to `http://localhost` or `http://127.0.0.1` instead of the proper app deep link.

## Root Cause
Supabase generates email confirmation links using the "Site URL" configured in the Supabase dashboard. This setting is **NOT** controlled by the `supabase/config.toml` file in the repository - that file only affects local development.

## Solution (5 minutes)

### Step 1: Configure Supabase Dashboard

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your hosted project
3. Navigate to: **Authentication → URL Configuration**
4. Configure the following settings:

   **Site URL:**
   ```
   huntlyclub://auth/confirm
   ```
   
   **Redirect URLs (add if not already present):**
   ```
   huntlyclub://auth/confirm
   ```

5. Click **Save**

### Step 2: Test the Fix

1. Create a new test account in your app:
   - Open the preview build on a device
   - Sign up with a new email address
   - Check the confirmation email

2. Verify the email link:
   - The link should start with `huntlyclub://` (not `http://localhost`)
   - Clicking the link should open your app
   - The account should be confirmed successfully

## Changes Take Effect Immediately

- No code deployment needed
- No app rebuild needed
- Changes apply to new emails immediately
- Existing unconfirmed accounts will receive new links with the correct URL

## Why This Happened

The `supabase/config.toml` in the repository contains:
```toml
site_url = "http://127.0.0.1:3000"
```

This is **correct for local development** but doesn't affect the hosted environment. Each Supabase project (local and hosted) has its own separate configuration.

## How to Prevent This

When setting up a new Supabase project:
1. Always configure the Site URL immediately after project creation
2. Use the deployment checklist in `DEPLOYMENT.md`
3. Test the email confirmation flow before releasing to users

## Additional Resources

- Full deployment guide: See `DEPLOYMENT.md`
- Troubleshooting: See `README.md` → Troubleshooting section
- Supabase docs: [Auth Configuration](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts#authentication-configuration)

## Technical Details

### How Supabase Email Confirmation Works

1. User signs up via `supabase.auth.signUp()`
2. Supabase sends a confirmation email
3. The email contains a link generated from: **Site URL + auth token**
4. User clicks the link, which redirects to the configured URL
5. For mobile apps, this should be a deep link (e.g., `huntlyclub://`)
6. The app intercepts the deep link and completes confirmation

### The Role of emailRedirectTo

In `services/authService.ts`, we pass `emailRedirectTo`:
```typescript
const redirectUrl = Linking.createURL('auth/confirm');

await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectUrl,
  },
});
```

This parameter is a **hint** to Supabase but doesn't override the Site URL. The Site URL must still be configured correctly in the dashboard.

## What NOT to Do

❌ Don't modify `supabase/config.toml` - it only affects local development
❌ Don't add environment variables for the Site URL - it's dashboard-configured
❌ Don't rebuild the app - the fix is server-side only
❌ Don't modify the email templates - they use `{{ .ConfirmationURL }}` correctly

## What TO Do

✅ Configure Site URL in Supabase dashboard
✅ Test with a real email address
✅ Document the configuration for your team
✅ Add this to your deployment checklist
