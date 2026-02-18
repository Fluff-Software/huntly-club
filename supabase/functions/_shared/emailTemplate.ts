/**
 * Huntly World branded email template.
 * Uses inline styles for broad email-client support.
 * Logo URL: set EMAIL_LOGO_URL in Edge Function secrets (e.g. https://www.huntly.world/logo.png).
 */

// Huntly brand colors (from apps/mobile/tailwind.config.js)
const BRAND = {
  forest: "#2D5A27",
  leaf: "#4A7C59",
  sage: "#7FB069",
  mint: "#A8D5BA",
  cream: "#FFF8DC",
  charcoal: "#36454F",
  white: "#FFFFFF",
} as const;

function getLogoUrl(): string {
  return Deno.env.get("EMAIL_LOGO_URL") ?? "https://www.huntly.world/logo.png";
}

/**
 * Wraps email body HTML in a full Huntly World–branded layout with optional logo.
 * Use for auth emails, photo emails, etc.
 */
export function wrapEmailBody(bodyHtml: string, options?: { showLogo?: boolean }): string {
  const showLogo = options?.showLogo !== false;
  const logoUrl = getLogoUrl();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Huntly World</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: ${BRAND.charcoal};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.cream};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background-color: ${BRAND.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <!-- Header with logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.forest} 0%, ${BRAND.leaf} 100%); padding: 28px 24px; text-align: center;">
              ${showLogo ? `<img src="${logoUrl}" alt="Huntly World" width="160" height="auto" style="display: inline-block; max-height: 48px; width: auto;" />` : ""}
              ${showLogo ? "" : `<span style="font-size: 22px; font-weight: 700; color: ${BRAND.white}; letter-spacing: -0.5px;">Huntly World</span>`}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; border-top: 1px solid ${BRAND.mint}; background-color: ${BRAND.white}; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: ${BRAND.charcoal};">
                — The Huntly World team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds a simple CTA button link for use inside the body (inline styles).
 */
export function ctaButton(href: string, label: string): string {
  return `
    <p style="margin: 24px 0;">
      <a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${BRAND.leaf}; color: ${BRAND.white}; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px;">${label}</a>
    </p>`;
}
