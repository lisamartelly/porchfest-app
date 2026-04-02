import { Resend } from "resend";
import logger from "../lib/logger.js";

let resend: Resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendReviewerAssignmentEmail(
  to: string,
  reviewerName: string,
  bandCount: number,
  eventName: string
) {
  const fromEmail = process.env.FROM_EMAIL || "noreply@porchfest.app";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const reviewsUrl = `${frontendUrl}/admin?section=my-reviews`;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: `You've been assigned bands to review for ${eventName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; color: #111827; margin-bottom: 16px;">
          Band Review Assignment
        </h1>
        <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 8px;">
          Hi <strong>${reviewerName}</strong>,
        </p>
        <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
          You've been assigned <strong>${bandCount} band${bandCount === 1 ? "" : "s"}</strong>
          to review for <strong>${eventName}</strong>.
          Please log in and review your assigned bands at your earliest convenience.
        </p>
        <a href="${reviewsUrl}"
           style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
          View My Assignments
        </a>
        <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; line-height: 1.5;">
          If you have questions about the review process, please reach out to your organization admin.
        </p>
      </div>
    `,
  });

  if (error) {
    logger.error({ err: error }, "Failed to send reviewer assignment email");
    throw new Error("Failed to send email");
  }
}

export async function sendBandMagicLink(
  to: string,
  magicLinkUrl: string,
  bandName: string,
  eventName: string
) {
  const fromEmail = process.env.FROM_EMAIL || "noreply@porchfest.app";
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
    logger.error({ err: error }, "Failed to send magic link email");
    throw new Error("Failed to send email");
  }
}
