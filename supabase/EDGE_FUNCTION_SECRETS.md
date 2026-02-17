# Edge Function Secrets (Mailjet + Auth)

The auth email edge functions (`signup-with-email`, `resend-auth-email`) need the following secrets configured in your Supabase project. Set them via the Supabase Dashboard (Project Settings → Edge Functions → Secrets) or the CLI. These are **not** stored in the repo or in the mobile app’s `.env`.

**Required for sending auth emails:**

```bash
supabase secrets set MAILJET_API_KEY=your_mailjet_api_key
supabase secrets set MAILJET_API_SECRET=your_mailjet_api_secret
supabase secrets set MAILJET_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set MAILJET_FROM_NAME="Huntly Club"
supabase secrets set FRONTEND_CONFIRM_REDIRECT=huntlyclub://auth/confirm
supabase secrets set FRONTEND_RESET_REDIRECT=https://www.huntly.world/auth/reset-password
```

- **MAILJET_API_KEY** / **MAILJET_API_SECRET**: From [Mailjet API Key Management](https://app.mailjet.com/account/api_keys). Used for Send API v3.1 (Basic auth).
- **MAILJET_FROM_EMAIL**: Sender address for auth emails. Must be a validated sender in Mailjet.
- **MAILJET_FROM_NAME**: Display name for the sender.
- **FRONTEND_CONFIRM_REDIRECT**: URL used in verification emails (default: website confirm page).
- **FRONTEND_RESET_REDIRECT**: URL for password reset emails (default: `https://www.huntly.world/auth/reset-password`). Use the website URL so the link works when opened in a browser; deep links like `huntlyclub://auth/reset-password` can show a blank page if the app doesn’t handle the link.

**Optional (deliverability):**

- **MAILJET_REPLY_TO**: Reply-To address (e.g. `support@yourdomain.com`). If unset, `MAILJET_FROM_EMAIL` is used.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to Edge Functions; you do not need to set them manually.

**If reset-password email links open a blank page:** The link is using a deep link (e.g. `huntlyworld://auth/reset-password`) which browsers can’t open. Set the secret so the link uses the website instead:

```bash
supabase secrets set FRONTEND_RESET_REDIRECT=https://www.huntly.world/auth/reset-password
```

Then redeploy the function: `supabase functions deploy resend-auth-email`. New reset emails will point to the website; existing emails will still have the old link.

---

## Reducing soft bounces (Mailjet + Supabase)

There’s no widely reported “Supabase + Mailjet” soft-bounce bug; issues are usually domain/auth or recipient-side. Below is a focused checklist.

### 1. Get the actual bounce reason

- In Mailjet: **Statistics → Latest messages sent** (or **View all stats**).
- **Click the subject line** of the bounced message (e.g. “Verify your email for Huntly Club”).
- Check the **Details** column (or the message detail view) for the reason (e.g. “SPF fail”, “mailbox full”, “greylisting”). That tells you whether it’s auth, reputation, or recipient.

### 2. SPF (one record, under 10 lookups)

- You must have **exactly one SPF TXT record** for the sending domain. Multiple SPF records cause **PermError** and often soft bounces.
- **Append** Mailjet to your existing SPF; don’t replace it:  
  `v=spf1 include:spf.mailjet.com ... ~all`
- SPF has a **10 DNS lookup limit**. Too many `include:`/mechanisms can cause failure; use SPF flattening or a single consolidated record if you have many senders.

### 3. DKIM

- Enable DKIM for the **exact domain** you send from (e.g. `huntly.world` or `mail.huntly.world`).
- Add the DKIM value as a **single TXT record**, with the key on **one line** (no line breaks in the value). Broken formatting can invalidate the signature.

### 4. Sender domain and reputation

- Send from **your own domain** (e.g. `noreply@huntly.world` or `noreply@mail.huntly.world`), not from a free provider.
- Using a **dedicated subdomain** (e.g. `mail.huntly.world`) isolates reputation and is recommended by providers (e.g. Resend/Supabase docs) for transactional mail.
- **Warm up**: new domains and low volume are treated cautiously; send steadily to a small set of known addresses first.

### 5. DMARC (optional but helpful)

- Add a DMARC record (e.g. `p=none` initially) so providers see you care about auth. This can improve trust and reduce soft bounces over time.

### 6. What we already do in code

- **Subject** – Always set (e.g. “Verify your email for Huntly Club”); empty subject is fallback-protected in the Mailjet helper.
- **Reply-To** – Set (from address or `MAILJET_REPLY_TO`).
- **Content** – Plain, conversational copy; no link/open tracking that could break Supabase auth links.

### 7. If it’s one provider (e.g. Outlook/Hotmail)

- Check the bounce reason in step 1. If SPF/DKIM show “Pass” in Mailjet but that provider still soft-bounces, it’s often reputation or their policy. Options: warm up, contact Mailjet support with the message ID and bounce reason, and consider their “Sender reputation” / deliverability tools.
