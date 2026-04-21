import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/about",
  "/services",
  "/prices",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_PREFIXES = ["/preview"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    PUBLIC_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/api/")
  );
}

function getHomePathByRole(role: string | undefined): string {
  if (role === "client") return "/client";
  if (role === "technician") return "/technician";
  return "/dashboard";
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp || "unknown";
}

type ApiRatePolicy = {
  key: string;
  maxRequests: number;
  windowSeconds: number;
};

function getApiRatePolicy(pathname: string, method: string): ApiRatePolicy {
  const upperMethod = method.toUpperCase();

  if (pathname.startsWith("/api/auth/")) {
    return { key: "api-auth", maxRequests: 10, windowSeconds: 60 };
  }

  if (pathname.startsWith("/api/reports") || pathname.startsWith("/api/invoice")) {
    return { key: "api-heavy", maxRequests: 20, windowSeconds: 60 };
  }

  if (upperMethod === "POST" || upperMethod === "PUT" || upperMethod === "PATCH" || upperMethod === "DELETE") {
    return { key: "api-write", maxRequests: 60, windowSeconds: 60 };
  }

  return { key: "api-read", maxRequests: 180, windowSeconds: 60 };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.get("gs_auth")?.value === "1";
  const role = request.cookies.get("gs_role")?.value;
  const homePath = getHomePathByRole(role);

  if (pathname.startsWith("/api/")) {
    const policy = getApiRatePolicy(pathname, request.method);
    const ip = getClientIp(request);
    const limitKey = `${policy.key}:${ip}`;
    const { allowed, remaining } = await checkRateLimit(limitKey, {
      maxRequests: policy.maxRequests,
      windowSeconds: policy.windowSeconds,
      prefix: "middleware",
    });

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(policy.windowSeconds),
            "X-RateLimit-Limit": String(policy.maxRequests),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(policy.maxRequests));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

  if (!isPublicPath(pathname) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const allowRelogin = request.nextUrl.searchParams.get("relogin") === "1";

  if (pathname === "/login" && isLoggedIn && !allowRelogin) {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  // Role-aware guardrails
  if (isLoggedIn && role === "client" && !pathname.startsWith("/client")) {
    const isAllowed =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      PUBLIC_PATHS.includes(pathname);
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/client", request.url));
    }
  }

  if (
    isLoggedIn &&
    role === "technician" &&
    !pathname.startsWith("/technician")
  ) {
    const isAllowed =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      PUBLIC_PATHS.includes(pathname);
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/technician", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static assets from middleware so files in /public resolve normally.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
