import { NextResponse } from "next/server";
import { getClientProjectDetailFromDb } from "@/lib/server/projects-repository";
import { requireClient } from "@/lib/server/auth-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await getClientProjectDetailFromDb(id, auth.userId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
