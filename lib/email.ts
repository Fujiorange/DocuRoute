import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@docuroute.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "DocuRoute";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a generic email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Email not sent:", options.subject);
    return;
  }

  await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  companyName: string,
  token: string,
  role: string
): Promise<void> {
  const acceptUrl = `${APP_URL}/invite/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">DocuRoute</h1>
        </div>
        <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">You're invited to join ${companyName}</h2>
          <p style="font-size: 16px; color: #555;">
            ${inviterName} has invited you to join <strong>${companyName}</strong> on DocuRoute as a <strong>${role}</strong>.
          </p>
          <p style="font-size: 16px; color: #555;">
            DocuRoute is a document management platform for construction and engineering companies.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #777; margin-top: 30px;">
            Or copy and paste this link into your browser:<br>
            <a href="${acceptUrl}" style="color: #667eea; word-break: break-all;">${acceptUrl}</a>
          </p>
          <p style="font-size: 14px; color: #777; margin-top: 20px;">
            This invitation link will expire in 7 days.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
You're invited to join ${companyName}

${inviterName} has invited you to join ${companyName} on DocuRoute as a ${role}.

Accept the invitation by visiting: ${acceptUrl}

This link will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `;

  await sendEmail({
    to,
    subject: `Invitation to join ${companyName} on DocuRoute`,
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">DocuRoute</h1>
        </div>
        <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #555;">
            Hi ${name},
          </p>
          <p style="font-size: 16px; color: #555;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #777; margin-top: 30px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="font-size: 14px; color: #777; margin-top: 20px;">
            This password reset link will expire in 1 hour.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${name},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
  `;

  await sendEmail({
    to,
    subject: "Reset Your DocuRoute Password",
    html,
    text,
  });
}

/**
 * Send document upload notification
 */
export async function sendDocumentUploadNotification(
  to: string,
  uploaderName: string,
  documentTitle: string,
  projectName: string,
  companyName: string
): Promise<void> {
  const dashboardUrl = `${APP_URL}/dashboard/documents`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">DocuRoute</h1>
        </div>
        <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">New Document Uploaded</h2>
          <p style="font-size: 16px; color: #555;">
            <strong>${uploaderName}</strong> uploaded a new document to <strong>${projectName}</strong>:
          </p>
          <div style="background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">${documentTitle}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              View Document
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            ${companyName} • DocuRoute
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
New Document Uploaded

${uploaderName} uploaded a new document to ${projectName}:

"${documentTitle}"

View it at: ${dashboardUrl}

${companyName} • DocuRoute
  `;

  await sendEmail({
    to,
    subject: `New Document: ${documentTitle}`,
    html,
    text,
  });
}

/**
 * Send approval request notification
 */
export async function sendApprovalRequestNotification(
  to: string,
  requesterName: string,
  documentTitle: string,
  projectName: string
): Promise<void> {
  const dashboardUrl = `${APP_URL}/dashboard/documents`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">DocuRoute</h1>
        </div>
        <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Document Approval Requested</h2>
          <p style="font-size: 16px; color: #555;">
            <strong>${requesterName}</strong> is requesting your approval for a document in <strong>${projectName}</strong>:
          </p>
          <div style="background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">${documentTitle}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Review Document
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Document Approval Requested

${requesterName} is requesting your approval for a document in ${projectName}:

"${documentTitle}"

Review it at: ${dashboardUrl}
  `;

  await sendEmail({
    to,
    subject: `Approval Request: ${documentTitle}`,
    html,
    text,
  });
}
