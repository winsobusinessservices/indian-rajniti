const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const emailPort = Number(process.env.EMAIL_PORT);
const useTls = String(process.env.EMAIL_USE_TLS).toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: emailPort,
  secure: emailPort === 465,
  requireTLS: useTls && emailPort !== 465,
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
});

// Matches the frontend theme tokens in globals.css:
// primary #002068, primary-container #003399, primary-fixed #dce1ff.
const BRAND_COLOR = "#002068";
const BRAND_CONTAINER = "#003399";
const BRAND_LIGHT = "#dce1ff";
const SITE_URL = (process.env.CLIENT_ORIGIN || "https://indianrajniti.in").split(",")[0].replace(/\/$/, "");
const EMAIL_LOGO_URL = String(process.env.EMAIL_LOGO_URL || `${SITE_URL}/images/logo.png`).trim();
const LOCAL_LOGO_PATH = path.resolve(__dirname, "../../../indian-rajniti-frontend/public/images/logo.png");
const EMAIL_LOGO_CID = "indian-rajneeti-logo";
const EMAIL_LOGO_SRC = fs.existsSync(LOCAL_LOGO_PATH) ? `cid:${EMAIL_LOGO_CID}` : EMAIL_LOGO_URL;
const PANEL_URL = (process.env.PANEL_ORIGIN || "https://indianrajneeti.com").trim().replace(/\/$/, "");
const STAFF_ROLES = new Set(["AUTHOR", "EDITOR", "ADMIN", "SUBADMIN"]);

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function emailBranding() {
  return fs.existsSync(LOCAL_LOGO_PATH)
    ? { attachments: [{ filename: "indian-rajneeti-logo.png", path: LOCAL_LOGO_PATH, cid: EMAIL_LOGO_CID }] }
    : {};
}

function emailButton(label, href) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
      <tr>
        <td bgcolor="${BRAND_COLOR}" style="border-radius:6px;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function emailTemplate({ preheader, eyebrow = "INDIAN RAJNEETI", title, content }) {
  return `<!doctype html>
  <html lang="en">
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;padding:0;background:#f3f5fb;color:#252525;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5fb;">
        <tr><td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #d9deed;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND_CONTAINER};padding:24px 28px;text-align:center;">
                <a href="${escapeHtml(SITE_URL)}" style="display:inline-block;max-width:320px;text-decoration:none;">
                  <img src="${escapeHtml(EMAIL_LOGO_SRC)}" width="300" alt="Indian Rajneeti" style="display:block;width:100%;max-width:300px;max-height:108px;height:auto;box-sizing:border-box;border:0;border-radius:8px;background:#ffffff;padding:8px;object-fit:contain;" />
                </a>
                <div style="margin-top:10px;color:${BRAND_LIGHT};font-size:10px;letter-spacing:2px;text-transform:uppercase;">Indian political news &amp; analysis</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px;">
                <div style="color:${BRAND_COLOR};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>
                <h1 style="margin:9px 0 20px;color:#18213b;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.25;">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.7;color:#46506a;">${content}</div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #d9deed;padding:20px 32px;text-align:center;color:#697086;font-size:11px;line-height:1.6;">
                This is an automated message from Indian Rajneeti.<br />
                <a href="${escapeHtml(SITE_URL)}" style="color:${BRAND_COLOR};text-decoration:none;">${escapeHtml(SITE_URL)}</a>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

async function sendPasswordResetEmail(to, resetUrl) {
  await transporter.sendMail({
    ...emailBranding(),
    from: `"Indian Rajneeti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: "Reset your Indian Rajneeti password",

    text: `You requested a password reset.

Click the link below to reset your password:

${resetUrl}

This link will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email.`,

    html: emailTemplate({
      preheader: "Reset your Indian Rajneeti password",
      eyebrow: "Account security",
      title: "Reset your password",
      content: `<p style="margin:0 0 14px;">We received a request to reset your Indian Rajneeti password.</p><p style="margin:0;">Use the secure button below to choose a new password.</p>${emailButton("Reset password", resetUrl)}<p style="margin:0 0 10px;"><strong>This link expires in 15 minutes.</strong></p><p style="margin:0;color:#697086;font-size:13px;">If you did not request a password reset, you can safely ignore this email.</p>`,
    }),
  });
}

async function sendRegistrationOtpEmail(to, otp) {
  await transporter.sendMail({
    ...emailBranding(),
    from: `"Indian Rajneeti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: "Verify your Indian Rajneeti email",
    text: `Your Indian Rajneeti verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: emailTemplate({
      preheader: `Your verification code is ${otp}`,
      eyebrow: "Email verification",
      title: "Verify your email address",
      content: `<p style="margin:0;">Use this code to complete your Indian Rajneeti registration:</p><div style="margin:24px 0;padding:18px;border:1px solid #b5c4ff;border-radius:8px;background:#f4f6ff;text-align:center;color:${BRAND_COLOR};font-size:34px;font-weight:700;letter-spacing:9px;">${escapeHtml(otp)}</div><p style="margin:0 0 10px;"><strong>This code expires in 10 minutes.</strong></p><p style="margin:0;color:#697086;font-size:13px;">Never share this code. If you did not request it, you can ignore this email.</p>`,
    }),
  });
}

async function sendApplicationShortlistedEmail(to, name, jobTitle) {
  await transporter.sendMail({
    ...emailBranding(),
    from: `"Indian Rajneeti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: `You've been shortlisted — ${jobTitle}`,

    text: `Hi ${name},

Good news — you've been shortlisted for the ${jobTitle} position at Indian Rajneeti.

Our team will be in touch shortly with the next steps.

Congratulations!`,

    html: emailTemplate({
      preheader: `You have been shortlisted for ${jobTitle}`,
      eyebrow: "Careers update",
      title: "You have been shortlisted!",
      content: `<p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p><p style="margin:0 0 14px;">Good news — you have been shortlisted for the <strong>${escapeHtml(jobTitle)}</strong> position at Indian Rajneeti.</p><p style="margin:0;">Our team will contact you shortly with the next steps. Congratulations!</p>`,
    }),
  });
}

async function sendRoleChangedEmail(to, name, oldRole, newRole) {
  const loginUrl = `${STAFF_ROLES.has(newRole) ? PANEL_URL : SITE_URL}/login`;

  await transporter.sendMail({
    ...emailBranding(),
    from: `"Indian Rajneeti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: "Your Indian Rajneeti account role has changed",

    text: `Hi ${name},

An admin has changed your role on Indian Rajneeti from ${oldRole} to ${newRole}.

Sign in here: ${loginUrl}

If you have any questions about this change, please contact an admin.`,

    html: emailTemplate({
      preheader: `Your account role is now ${newRole}`,
      eyebrow: "Account update",
      title: "Your role has changed",
      content: `<p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p><p style="margin:0;">An administrator changed your Indian Rajneeti role from <strong>${escapeHtml(oldRole)}</strong> to <strong>${escapeHtml(newRole)}</strong>.</p>${emailButton("Sign in", loginUrl)}<p style="margin:0;color:#697086;font-size:13px;">If you have questions about this change, please contact an administrator.</p>`,
    }),
  });
}

async function sendInvestorApprovedEmail(to, name, { separateAccount = false } = {}) {
  const dashboardUrl = `${SITE_URL}/investor/dashboard`;
  await transporter.sendMail({
    ...emailBranding(),
    from: `"Indian Rajneeti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: "Your investor application has been approved",
    text: `Hi ${name},\n\nYour investor application has been approved.${separateAccount ? " A separate Investor account has been created for this email. Please use the password-setup email before signing in." : " Your existing Indian Rajneeti account now has Investor access."}\n\nInvestor dashboard: ${dashboardUrl}\n\nIf you have questions, please contact our team.`,
    html: emailTemplate({
      preheader: "Your investor application has been approved",
      eyebrow: "Investor relations",
      title: "Welcome as an investor",
      content: `<p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p><p style="margin:0 0 14px;">Your investor application has been approved.</p><p style="margin:0;">${separateAccount ? "A separate Investor account has been created for this email. Please use the password-setup email before signing in." : "Your existing Indian Rajneeti account now has Investor access."}</p>${emailButton("Open investor dashboard", dashboardUrl)}<p style="margin:0;color:#697086;font-size:13px;">If you have questions, please contact our team.</p>`,
    }),
  });
}

async function sendContactEmail({ name, email, phone, subject, message }) {
  const recipient = process.env.CONTACT_EMAIL || process.env.EMAIL_HOST_USER;
  await transporter.sendMail({
    ...emailBranding(),
    from: `"Indian Rajneeti Contact" <${process.env.EMAIL_HOST_USER}>`,
    replyTo: email,
    to: recipient,
    subject: `[Contact] ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\n\n${message}`,
    html: emailTemplate({
      preheader: `New contact message from ${name}`,
      eyebrow: "Website contact",
      title: "New contact message",
      content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;background:#f4f6ff;border:1px solid #d9deed;border-radius:8px;"><tr><td style="padding:16px;"><strong>Name:</strong> ${escapeHtml(name)}<br /><strong>Email:</strong> ${escapeHtml(email)}<br /><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}<br /><strong>Subject:</strong> ${escapeHtml(subject)}</td></tr></table><div style="white-space:pre-wrap;">${escapeHtml(message)}</div>`,
    }),
  });
}

module.exports = {
  sendRegistrationOtpEmail,
  sendPasswordResetEmail,
  sendApplicationShortlistedEmail,
  sendRoleChangedEmail,
  sendInvestorApprovedEmail,
  sendContactEmail,
};
