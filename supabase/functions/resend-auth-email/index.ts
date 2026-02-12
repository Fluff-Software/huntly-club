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
    const confirmRedirect = Deno.env.get("FRONTEND_CONFIRM_REDIRECT") ?? "huntlyclub://auth/confirm";
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

    const fromName = Deno.env.get("MAILJET_FROM_NAME") ?? "Huntly Club";
    if (type === "recovery") {
      const subject = "Reset your Huntly Club password";
      const htmlPart = `
        <p>You requested a password reset for Huntly Club.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${actionLink}">Reset password</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `;
      const textPart = `Reset your Huntly Club password by visiting: ${actionLink}`;
      await sendEmail({ to: email, subject, htmlPart, textPart });
    } else {
      const subject = "Confirm your Huntly Club account";
      const htmlPart = `
        <p>Click the link below to confirm your email and continue:</p>
        <p><a href="${actionLink}">Confirm your email</a></p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `;
      const textPart = `Confirm your email by visiting: ${actionLink}`;
      await sendEmail({ to: email, subject, htmlPart, textPart });
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
