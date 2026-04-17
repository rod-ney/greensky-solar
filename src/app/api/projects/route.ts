import { NextResponse } from "next/server";
import {
  createProjectInDb,
  listProjectsFromDb,
  listProjectsForTechnicianFromDb,
} from "@/lib/server/projects-repository";
import { getTechnicianIdByUserId } from "@/lib/server/general-repository";
import { requireAdmin, requireAdminOrTechnician } from "@/lib/server/auth-guard";
import { createProjectSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET(request: Request) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    if (auth.role === "technician") {
      const technicianId = await getTechnicianIdByUserId(auth.userId);
      if (!technicianId) {
        return NextResponse.json({ items: [], total: 0, hasMore: false });
      }
      const result = await listProjectsForTechnicianFromDb(technicianId);
      return NextResponse.json(result);
    }
    const { searchParams } = new URL(request.url);
    const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined;
    const result = await listProjectsFromDb({ limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, createProjectSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const project = await createProjectInDb({
      name: body.name,
      client: body.client,
      location: body.location,
      startDate: body.startDate,
      endDate: body.endDate,
      budget: body.budget,
      priority: body.priority,
      description: body.description,
      projectLead: body.projectLead || undefined,
      assignedTechnicians: body.assignedTechnicians,
      bookingId: body.bookingId,
      userId: body.userId,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
