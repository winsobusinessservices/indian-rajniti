const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
});

async function sendPasswordResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from: `"Indian Rajniti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: "Reset your Indian Rajniti password",

    text: `You requested a password reset.

Click the link below to reset your password:

${resetUrl}

This link will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email.`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Reset Your Password</h2>

        <p>
          We received a request to reset your Indian Rajniti password.
        </p>

        <p>
          Click the button below to create a new password.
        </p>

        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #1d4ed8;
            color: white;
            text-decoration: none;
            border-radius: 6px;
          "
        >
          Reset Password
        </a>

        <p style="margin-top: 20px;">
          This link will expire in <strong>15 minutes</strong>.
        </p>

        <p>
          If you did not request this password reset, you can safely ignore
          this email.
        </p>
      </div>
    `,
  });
}

async function sendApplicationShortlistedEmail(to, name, jobTitle) {
  await transporter.sendMail({
    from: `"Indian Rajniti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: `You've been shortlisted — ${jobTitle}`,

    text: `Hi ${name},

Good news — you've been shortlisted for the ${jobTitle} position at Indian Rajniti.

Our team will be in touch shortly with the next steps.

Congratulations!`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>You've been shortlisted!</h2>

        <p>Hi ${name},</p>

        <p>
          Good news — you've been shortlisted for the <strong>${jobTitle}</strong> position at Indian Rajniti.
        </p>

        <p>
          Our team will be in touch shortly with the next steps.
        </p>

        <p>Congratulations!</p>
      </div>
    `,
  });
}

async function sendRoleChangedEmail(to, name, oldRole, newRole) {
  const loginUrl = `${process.env.CLIENT_ORIGIN}/login`;

  await transporter.sendMail({
    from: `"Indian Rajniti" <${process.env.EMAIL_HOST_USER}>`,
    to,
    subject: "Your Indian Rajniti account role has changed",

    text: `Hi ${name},

An admin has changed your role on Indian Rajniti from ${oldRole} to ${newRole}.

Sign in here: ${loginUrl}

If you have any questions about this change, please contact an admin.`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Your Role Has Changed</h2>

        <p>Hi ${name},</p>

        <p>
          An admin has changed your role on Indian Rajniti from
          <strong>${oldRole}</strong> to <strong>${newRole}</strong>.
        </p>

        <a
          href="${loginUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #1d4ed8;
            color: white;
            text-decoration: none;
            border-radius: 6px;
          "
        >
          Sign In
        </a>

        <p style="margin-top: 20px;">
          If you have any questions about this change, please contact an admin.
        </p>
      </div>
    `,
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendApplicationShortlistedEmail,
  sendRoleChangedEmail,
};