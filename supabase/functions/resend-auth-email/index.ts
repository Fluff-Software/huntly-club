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

type AuthEmailType = "signup" | "recovery";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { email?: string; type?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const type: AuthEmailType =
      body.type === "signup" || body.type === "recovery" ? body.type : "signup";

    if (!email) {
      return jsonResponse({ error: "Email is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Redirect to website handler; it sends mobile users to the app and web users to /verify-success
const confirmRedirect = Deno.env.get("FRONTEND_CONFIRM_REDIRECT") ?? "https://www.huntly.world/auth/confirm";
    const resetRedirect =
      Deno.env.get("FRONTEND_RESET_REDIRECT") ?? "huntlyclub://auth/reset-password";

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const redirectTo = type === "recovery" ? resetRedirect : confirmRedirect;
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type,
      email,
      options: { redirectTo },
    });

    const actionLink =
      (linkData as { properties?: { action_link?: string }; action_link?: string })?.properties
        ?.action_link ?? (linkData as { action_link?: string })?.action_link;
    if (linkError || !actionLink) {
      console.error("generateLink error:", linkError?.message ?? "no action_link");
      return jsonResponse(
        { error: "Could not generate link. Check that this email is registered." },
        400
      );
    }

    const replyTo = Deno.env.get("MAILJET_REPLY_TO");
    if (type === "recovery") {
      const subject = "Reset your Huntly Club password";
      const htmlPart = `
        <p>Hi there,</p>
        <p>You asked to reset your Huntly Club password. Open the link below to set a new password:</p>
        <p><a href="${actionLink}">Set new password</a></p>
        <p>This link will expire in 1 hour. If you didn't request this, you can ignore this email.</p>
        <p>— The Huntly Club team</p>
      `;
      const textPart = `Reset your Huntly Club password: ${actionLink}\n\nIf you didn't request this, you can ignore this email.`;
      await sendEmail({ to: email, subject, htmlPart, textPart, ...(replyTo && { replyTo }) });
    } else {
      const subject = "Verify your email for Huntly Club";
      const htmlPart = `
        <p>Hi there,</p>
        <p>You signed up for Huntly Club. To finish setting up your account, verify your email by opening the link below:</p>
        <p><a href="${actionLink}">Verify my email</a></p>
        <p>This link will expire in 24 hours. If you didn't sign up, you can safely ignore this message.</p>
        <p>— The Huntly Club team</p>
      `;
      const textPart = `You signed up for Huntly Club. Verify your email by visiting: ${actionLink}\n\nIf you didn't sign up, you can ignore this email.`;
      await sendEmail({ to: email, subject, htmlPart, textPart, ...(replyTo && { replyTo }) });
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Email could not be sent")) {
      return jsonResponse({ error: "Email could not be sent. Please try again later." }, 502);
    }
    console.error("resend-auth-email error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }

  return jsonResponse({ status: "ok" });
});
