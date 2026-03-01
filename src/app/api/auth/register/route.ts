import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import {
  createUserInDb,
  getAuthUserByEmailFromDb,
} from "@/lib/server/general-repository";
import { checkRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(`register:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }
  const result = await validateBody(request, registerSchema);
  if (!result.success) return result.response;
  const { name, email, password, contactNumber } = result.data;
  try {
    const existing = await getAuthUserByEmailFromDb(email);
    if (existing) {
      return NextResponse.json(
        { error: "Email is already registered." },
        { status: 409 }
      );
    }

    const created = await createUserInDb({
      name,
      email,
      passwordHash: hashPassword(password),
      contactNumber,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
