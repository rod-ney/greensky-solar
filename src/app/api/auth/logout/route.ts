import { NextResponse } from "next/server";

const COOKIE_NAMES = ["gs_auth", "gs_user_id", "gs_user_name", "gs_user_email", "gs_role"];

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of COOKIE_NAMES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return response;
}
