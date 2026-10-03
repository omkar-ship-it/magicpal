type SendResult = { ok: true } | { ok: false; error: string };

export const BRAND_NAME = "MagicPal";

/**
 * MSG91 v5 template email when configured, a console log otherwise. The
 * fallback isn't a stub to replace later — it's what keeps the whole sign-in
 * flow genuinely testable with zero credentials, locally or in a fresh
 * deploy nobody has wired up yet. `npm run test:flows` reads the code
 * straight out of this log.
 *
 * NOTE: MSG91 merge-tag names are exactly whatever text was typed into that
 * template's editor, and a mismatch is silent — MSG91 returns 2xx and the
 * email still arrives with a blank where the value should be. Read the live
 * template before changing the keys below.
 */
async function sendMsg91TemplateEmail(opts: {
  to: string;
  templateId: string | undefined;
  variables: Record<string, string>;
  logLabel: string;
  devFallbackMessage: string;
}): Promise<SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const domain = process.env.MSG91_EMAIL_DOMAIN;
  const fromEmail = process.env.MSG91_FROM_EMAIL;

  if (!authKey || !opts.templateId || !domain || !fromEmail) {
    console.log(`[${opts.logLabel}] ${opts.devFallbackMessage}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://control.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: [{ to: [{ email: opts.to }], variables: opts.variables }],
        from: { email: fromEmail, name: process.env.MSG91_FROM_NAME || BRAND_NAME },
        domain,
        template_id: opts.templateId,
      }),
    });

    const parsed = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[${opts.logLabel}] MSG91 send failed`, res.status, parsed);
      return { ok: false, error: "Couldn't send the email — try again?" };
    }
    console.log(`[${opts.logLabel}] queued to ${opts.to} via ${opts.templateId} — id ${parsed?.data?.unique_id ?? "?"}`);
    return { ok: true };
  } catch (err) {
    console.error(`[${opts.logLabel}] MSG91 send threw`, err);
    return { ok: false, error: "Couldn't send the email — try again?" };
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<SendResult> {
  return sendMsg91TemplateEmail({
    to,
    templateId: process.env.MSG91_EMAIL_TEMPLATE_ID,
    variables: { otp: code, company_name: BRAND_NAME },
    logLabel: "otp",
    devFallbackMessage: `login code for ${to} is ${code}`,
  });
}
