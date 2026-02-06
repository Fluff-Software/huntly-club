# Deployment Checklist for Huntly Club

This document provides a comprehensive checklist for deploying the Huntly Club app to production.

## Prerequisites

- [ ] Supabase account with a hosted project created
- [ ] Expo account and EAS CLI installed
- [ ] GitHub repository with Actions enabled
- [ ] RevenueCat account (optional, for in-app purchases)

## Supabase Setup

### 1. Project Configuration

- [ ] Create a Supabase project at [supabase.com](https://supabase.com)
- [ ] Note your project reference ID from the dashboard URL
- [ ] Note your database password

### 2. Authentication URL Configuration ⚠️ CRITICAL

**This is the most common cause of email confirmation issues.**

- [ ] Navigate to **Authentication → URL Configuration** in Supabase dashboard
- [ ] Set **Site URL** to: `huntlyclub://auth/confirm`
  - This is the deep link that will be used in email confirmation links
  - **Without this, users will receive localhost links in confirmation emails**
- [ ] Add the following to **Redirect URLs**:
  - `huntlyclub://auth/confirm`
  - `https://huntly.app/*` (if you have a web version)
  - `https://*.huntly.app/*` (for subdomains)
- [ ] Click **Save** to apply changes

### 3. Database & Edge Functions

- [ ] Set up GitHub Secrets (Settings → Secrets and variables → Actions):
  - `SUPABASE_ACCESS_TOKEN` - Generate from Supabase dashboard → Account → Access Tokens
  - `SUPABASE_PROJECT_REF` - Your project reference ID
  - `SUPABASE_DB_PASSWORD` - Your database password
- [ ] Push to `main` branch or manually trigger "Supabase (migrations + functions)" workflow
- [ ] Verify migrations applied successfully in Supabase dashboard → Database → Migrations
- [ ] Verify edge functions deployed in Supabase dashboard → Edge Functions

### 4. Email Templates (Optional Customization)

- [ ] Navigate to **Authentication → Email Templates** in Supabase dashboard
- [ ] Customize confirmation email template if desired
- [ ] Ensure template uses `{{ .ConfirmationURL }}` variable correctly
- [ ] Test by sending a test email

## EAS Build Configuration

### 1. Set EAS Secrets

These secrets are injected into the app at build time:

```bash
# Required: Supabase connection
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT_REF.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project

# Required: EAS project
eas secret:create --name EXPO_PUBLIC_EAS_PROJECT_ID --value "YOUR_EAS_PROJECT_ID" --scope project
eas secret:create --name EXPO_PUBLIC_OWNER --value "YOUR_EXPO_USERNAME_OR_ORG" --scope project

# Optional: RevenueCat (if using in-app purchases)
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "YOUR_IOS_KEY" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "YOUR_ANDROID_KEY" --scope project
```

- [ ] Verify secrets are set: `eas secret:list --scope project`

### 2. Device Registration (for internal builds)

- [ ] Register test devices: `eas device:create`
- [ ] Follow the instructions to add device UDIDs

### 3. Build the App

For internal testing (preview profile):
```bash
eas build --profile preview --platform all
```

Or use the Makefile shortcut:
```bash
make create-preview-build
```

For production (app store submission):
```bash
eas build --profile production --platform all
```

- [ ] Build completed successfully
- [ ] Download and install on test devices
- [ ] Verify app connects to hosted Supabase (not local)

## Testing Checklist

### Authentication Flow

- [ ] Sign up with a new email address
- [ ] Check email for confirmation link
- [ ] **VERIFY:** Email link starts with `huntlyclub://` (not `http://localhost` or `http://127.0.0.1`)
- [ ] Click confirmation link in email (should open the app)
- [ ] Verify account is confirmed and user is logged in
- [ ] Test sign out and sign in with the same account

### App Functionality

- [ ] Test core features of the app
- [ ] Verify data is saved to hosted Supabase (check dashboard)
- [ ] Test edge functions are working
- [ ] Verify deep linking works correctly

### Edge Cases

- [ ] Test with expired confirmation link
- [ ] Test with invalid email
- [ ] Test sign up with existing email
- [ ] Test password reset flow (if implemented)

## Common Issues & Solutions

### Issue: Confirmation emails still have localhost links

**Root cause:** Site URL not configured in Supabase dashboard

**Solution:**
1. Go to Supabase dashboard → Authentication → URL Configuration
2. Set Site URL to `huntlyclub://auth/confirm`
3. Save and test again by creating a new account

**Note:** The `supabase/config.toml` file in the repository only affects local development, NOT the hosted environment.

### Issue: App doesn't connect to hosted Supabase

**Root cause:** EAS secrets not set or app still using local env variables

**Solution:**
1. Verify EAS secrets: `eas secret:list --scope project`
2. Rebuild the app with `eas build` (rebuilding is required for secret changes)
3. Check the app's environment in the Expo dashboard

### Issue: Migrations not applied to hosted database

**Root cause:** GitHub workflow didn't run or failed

**Solution:**
1. Check GitHub Actions workflow runs
2. Verify GitHub secrets are set correctly
3. Manually trigger workflow: Actions → Supabase (migrations + functions) → Run workflow
4. Check workflow logs for errors

### Issue: Deep links not working on device

**Root cause:** App not properly configured for deep linking

**Solution:**
1. Verify `scheme: "huntlyclub"` in `app.config.ts`
2. Verify associated domains configured for iOS
3. Verify intent filters configured for Android
4. Rebuild the app after configuration changes

## Monitoring & Maintenance

- [ ] Set up Supabase dashboard alerts (Settings → Alerts)
- [ ] Monitor database usage and performance
- [ ] Monitor edge function logs
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Document any custom configurations for team members

## Environment Configuration Summary

| Environment | Supabase URL | Auth Site URL | How to Configure |
|-------------|--------------|---------------|------------------|
| **Local Dev** | `http://127.0.0.1:54321` | `http://127.0.0.1:3000` | `supabase/config.toml` + local `.env` |
| **Hosted (Preview/Prod)** | `https://YOUR_REF.supabase.co` | `huntlyclub://auth/confirm` | Supabase Dashboard + EAS Secrets |

**Key Takeaway:** Local config files don't affect hosted environment. Hosted configuration is done through Supabase dashboard and EAS secrets.
