import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailjet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

/** Check if email is already registered (mirrors check-email logic). */
async function isEmailTaken(admin: ReturnType<typeof createClient>, email: string): Promise<boolean> {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return false;
    const users = data?.users ?? [];
    const found = users.some((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return true;
    if (users.length < perPage) return false;
    page += 1;
    if (page > 100) return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { email?: string; password?: string; metadata?: Record<string, unknown> };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      return jsonResponse({ error: "Email is required." }, 400);
    }
    if (!password || password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const redirectTo = Deno.env.get("FRONTEND_CONFIRM_REDIRECT") ?? "huntlyclub://auth/confirm";

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (await isEmailTaken(admin, email)) {
      return jsonResponse({ error: "An account with this email already exists." }, 409);
    }

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: body.metadata ?? {},
    });

    if (createError) {
      console.error("createUser error:", createError.message);
      const msg = createError.message.toLowerCase().includes("already")
        ? "An account with this email already exists."
        : "Could not create account. Please try again.";
      return jsonResponse({ error: msg }, 400);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      options: { redirectTo },
    });

    const actionLink =
      (linkData as { properties?: { action_link?: string }; action_link?: string })?.properties?.action_link ??
      (linkData as { action_link?: string })?.action_link;
    if (linkError || !actionLink) {
      console.error("generateLink error:", linkError?.message ?? "no action_link");
      return jsonResponse({ error: "Could not generate verification link. Please try again." }, 500);
    }
    const subject = "Confirm your Huntly Club account";
    const htmlPart = `
      <p>Thanks for signing up for Huntly Club.</p>
      <p>Click the link below to confirm your email and continue:</p>
      <p><a href="${actionLink}">Confirm your email</a></p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `;
    const textPart = `Thanks for signing up for Huntly Club. Confirm your email by visiting: ${actionLink}`;

    await sendEmail({ to: email, subject, htmlPart, textPart });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Email could not be sent")) {
      return jsonResponse({ error: "Verification email could not be sent. Please try again later." }, 502);
    }
    console.error("signup-with-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }

  return jsonResponse({ status: "ok" });
});
