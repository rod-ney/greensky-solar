import { NextResponse } from "next/server";
import { listPaymentsFromDb } from "@/lib/server/general-repository";
import { requireClient } from "@/lib/server/auth-guard";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const payments = await listPaymentsFromDb(auth.userId);
    return NextResponse.json(payments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
