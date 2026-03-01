import { NextResponse } from "next/server";
import { listClientProjectsFromDb } from "@/lib/server/projects-repository";
import { requireClient } from "@/lib/server/auth-guard";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const projects = await listClientProjectsFromDb(auth.userId);
    return NextResponse.json(projects);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
