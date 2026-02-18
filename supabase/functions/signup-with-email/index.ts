import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailjet.ts";
import { wrapEmailBody, ctaButton } from "../_shared/emailTemplate.ts";

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

/** Create user via GoTrue REST API (admin.createUser is not available in Deno Edge Functions). */
async function createUserViaApi(
  supabaseUrl: string,
  serviceRoleKey: string,
  params: { email: string; password: string; user_metadata?: Record<string, unknown> }
): Promise<{ error?: string }> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      email_confirm: false,
      user_metadata: params.user_metadata ?? {},
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { msg?: string })?.msg ?? (err as { message?: string })?.message ?? res.statusText;
    return { error: msg };
  }
  return {};
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (await isEmailTaken(admin, email)) {
      return jsonResponse({ error: "An account with this email already exists." }, 409);
    }

    const createResult = await createUserViaApi(supabaseUrl, serviceRoleKey, {
      email,
      password,
      user_metadata: body.metadata ?? {},
    });

    if (createResult.error) {
      console.error("createUser error:", createResult.error);
      const msg = createResult.error.toLowerCase().includes("already")
        ? "An account with this email already exists."
        : "Could not create account. Please try again.";
      return jsonResponse({ error: msg }, 400);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
    });

    const actionLink =
      (linkData as { properties?: { action_link?: string }; action_link?: string })?.properties?.action_link ??
      (linkData as { action_link?: string })?.action_link;
    if (linkError || !actionLink) {
      console.error("generateLink error:", linkError?.message ?? "no action_link");
      return jsonResponse({ error: "Could not generate verification link. Please try again." }, 500);
    }
    const subject = "Verify your email for Huntly World";
    const bodyHtml = `
      <p style="margin: 0 0 16px; color: #36454F;">Hi there,</p>
      <p style="margin: 0 0 16px; color: #36454F;">You signed up for Huntly World. To finish setting up your account, verify your email using the button below.</p>
      ${ctaButton(actionLink, "Verify my email")}
      <p style="margin: 0; font-size: 14px; color: #36454F;">This link will expire in 24 hours. If you didn't sign up, you can safely ignore this message.</p>
    `;
    const htmlPart = wrapEmailBody(bodyHtml);
    const textPart = `You signed up for Huntly World. Verify your email by visiting: ${actionLink}\n\nIf you didn't sign up, you can ignore this email.`;
    const replyTo = Deno.env.get("MAILJET_REPLY_TO");

    await sendEmail({ to: email, subject, htmlPart, textPart, ...(replyTo && { replyTo }) });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Email could not be sent")) {
      return jsonResponse({ error: "Verification email could not be sent. Please try again later." }, 502);
    }
    console.error("signup-with-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }

  return jsonResponse({ status: "ok" });
});
