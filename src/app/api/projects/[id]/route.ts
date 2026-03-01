import { NextResponse } from "next/server";
import {
  getProjectByIdFromDb,
  deleteProjectInDb,
  updateProjectInDb,
} from "@/lib/server/projects-repository";
import { getTechnicianIdByUserId } from "@/lib/server/general-repository";
import { returnProjectInventory } from "@/lib/server/inventory-repository";
import { requireAdmin, requireAdminOrTechnician } from "@/lib/server/auth-guard";
import { updateProjectSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, updateProjectSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const { id } = await context.params;

    if (body.status === "cancelled") {
      const existing = await getProjectByIdFromDb(id);
      if (existing && existing.status !== "cancelled") {
        await returnProjectInventory(id, auth.userId);
      }
    }

    const updated = await updateProjectInDb(id, {
      name: body.name,
      description: body.description,
      status: body.status,
      priority: body.priority,
      location: body.location,
      startDate: body.startDate,
      endDate: body.endDate,
      budget: body.budget,
      progress: body.progress,
      assignedTechnicians: body.assignedTechnicians,
      userId: body.userId,
      warrantyStartDate: body.warrantyStartDate,
      warrantyEndDate: body.warrantyEndDate,
    });
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const deleted = await deleteProjectInDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const project = await getProjectByIdFromDb(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (auth.role === "technician") {
      const technicianId = await getTechnicianIdByUserId(auth.userId);
      if (!technicianId || (!project.assignedTechnicians.includes(technicianId) && project.projectLead !== technicianId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
