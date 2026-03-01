import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.get("gs_auth")?.value === "1";
  const role = request.cookies.get("gs_role")?.value;
  const homePath = getHomePathByRole(role);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? homePath : "/login", request.url)
    );
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
