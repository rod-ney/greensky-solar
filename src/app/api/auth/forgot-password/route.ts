import { NextResponse } from "next/server";
import { getAuthUserByEmailFromDb } from "@/lib/server/general-repository";
import { createPasswordResetToken } from "@/lib/server/password-reset";
import { forgotPasswordSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { checkRateLimit } from "@/lib/rate-limit";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function getBaseUrl(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = forwarded ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(`forgot-password:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many password reset requests. Please try again later." },
      { status: 429 }
    );
  }
  const result = await validateBody(request, forgotPasswordSchema);
  if (!result.success) return result.response;
  const { email } = result.data;
  try {

    const user = await getAuthUserByEmailFromDb(email);
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const baseUrl = getBaseUrl(request);
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      if (process.env.NODE_ENV === "development") {
        console.log("[DEV] Password reset link:", resetLink);
      }
      // TODO Phase 5: Send email via Resend/Nodemailer when configured
    }

    return NextResponse.json({
      message: "If an account exists with that email, we've sent a reset link.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
