import { Resend } from "resend";

let resend: Resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendBandMagicLink(
  to: string,
  magicLinkUrl: string,
  bandName: string,
  eventName: string
) {
  console.log("Sending band magic link to:", to);
  const fromEmail = process.env.FROM_EMAIL || "noreply@porchfest.app";
  console.log("From email:", fromEmail);
  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: `Edit your band info for ${eventName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; color: #111827; margin-bottom: 16px;">
          Edit Your Band Information
        </h1>
        <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 8px;">
          Hi <strong>${bandName}</strong>,
        </p>
        <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
          You requested a link to edit your band information for <strong>${eventName}</strong>.
          Click the button below to make changes to your application.
        </p>
        <a href="${magicLinkUrl}"
           style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
          Edit Band Info
        </a>
        <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; line-height: 1.5;">
          This link expires in 1 hour and can only be used once.
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send magic link email:", error);
    throw new Error("Failed to send email");
  }
}
