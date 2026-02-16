/**
 * When true, users must verify their email before using the app.
 * Set to false temporarily if you need to allow existing (pre-verification) users to continue.
 *
 * Note: "Email verified" comes from Supabase Auth's auth.users table (email_confirmed_at).
 * We do NOT store it in our own tables — we read it from the session (session.user.email_confirmed_at).
 */
export const REQUIRE_EMAIL_VERIFICATION = true;
