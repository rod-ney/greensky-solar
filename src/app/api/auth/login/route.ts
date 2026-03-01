import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { getAuthUserByEmailFromDb } from "@/lib/server/general-repository";
import { recordLoginActivityInDb } from "@/lib/server/profile-repository";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { createRequestLogger, getRequestId } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const COOKIE_MAX_AGE = 604800; // 7 days
const isProduction = process.env.NODE_ENV === "production";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(`login:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }
  const result = await validateBody(request, loginSchema);
  if (!result.success) return result.response;
  const { email, password } = result.data;
  const log = createRequestLogger({
    requestId: getRequestId(request),
    route: "/api/auth/login",
  });
  try {
    const user = await getAuthUserByEmailFromDb(email);
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await recordLoginActivityInDb({
      userId: user.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    };

    response.cookies.set("gs_auth", "1", cookieOpts);
    response.cookies.set("gs_user_id", user.id, cookieOpts);
    response.cookies.set("gs_user_name", user.name, cookieOpts);
    response.cookies.set("gs_user_email", user.email, cookieOpts);
    response.cookies.set("gs_role", user.role, cookieOpts);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Login failed", error, { email: email.slice(0, 3) + "***" });
    Sentry.captureException(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
