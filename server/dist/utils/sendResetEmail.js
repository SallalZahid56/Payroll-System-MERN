"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetEmail = void 0;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const sendResetEmail = async (toEmail, resetLink) => {
    try {
        await resend.emails.send({
            from: "noreply@infonavigators.com",
            to: toEmail,
            subject: "Reset your INFONAV password",
            html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to set a new one.</p>
          <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background:#7c3aed; color:#fff; text-decoration:none; border-radius:6px; margin: 12px 0;">
            Reset Password
          </a>
          <p>This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
        });
    }
    catch (err) {
        console.error("Error sending reset email:", err);
        throw new Error("Failed to send reset email");
    }
};
exports.sendResetEmail = sendResetEmail;
