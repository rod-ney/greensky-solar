import { createHash } from "node:crypto";

export async function sendPasswordResetEmail(options: {
  to: string;
  resetLink: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: [options.to],
      subject: "Reset your GreenSky Solar password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Password reset request</h2>
          <p>You requested a password reset for your GreenSky Solar account.</p>
          <p><a href="${options.resetLink}">Reset your password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send password reset email: ${text}`);
  }
}
