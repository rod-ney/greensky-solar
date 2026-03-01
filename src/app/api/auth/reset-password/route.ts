import { NextResponse } from "next/server";
import { consumePasswordResetToken, updatePasswordInDb } from "@/lib/server/password-reset";
import { resetPasswordSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { checkRateLimit } from "@/lib/rate-limit";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(`reset-password:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many password reset attempts. Please try again later." },
      { status: 429 }
    );
  }
  const result = await validateBody(request, resetPasswordSchema);
  if (!result.success) return result.response;
  const { token, password } = result.data;
  try {
    const resetResult = await consumePasswordResetToken(token);
    if (!resetResult) {
      return NextResponse.json(
        { error: "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    await updatePasswordInDb(resetResult.userId, password);
    return NextResponse.json({ message: "Password reset successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
