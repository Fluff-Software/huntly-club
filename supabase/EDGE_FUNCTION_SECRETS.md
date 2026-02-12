# Edge Function Secrets (Mailjet + Auth)

The auth email edge functions (`signup-with-email`, `resend-auth-email`) need the following secrets configured in your Supabase project. Set them via the Supabase Dashboard (Project Settings → Edge Functions → Secrets) or the CLI. These are **not** stored in the repo or in the mobile app’s `.env`.

**Required for sending auth emails:**

```bash
supabase secrets set MAILJET_API_KEY=your_mailjet_api_key
supabase secrets set MAILJET_API_SECRET=your_mailjet_api_secret
supabase secrets set MAILJET_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set MAILJET_FROM_NAME="Huntly Club"
supabase secrets set FRONTEND_CONFIRM_REDIRECT=huntlyclub://auth/confirm
supabase secrets set FRONTEND_RESET_REDIRECT=huntlyclub://auth/reset-password
```

- **MAILJET_API_KEY** / **MAILJET_API_SECRET**: From [Mailjet API Key Management](https://app.mailjet.com/account/api_keys). Used for Send API v3.1 (Basic auth).
- **MAILJET_FROM_EMAIL**: Sender address for auth emails. Must be a validated sender in Mailjet.
- **MAILJET_FROM_NAME**: Display name for the sender.
- **FRONTEND_CONFIRM_REDIRECT**: Deep link used in verification emails (must match the app’s confirm route).
- **FRONTEND_RESET_REDIRECT**: Deep link for password reset emails (used when `type: 'recovery'` in resend-auth-email).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to Edge Functions; you do not need to set them manually.
