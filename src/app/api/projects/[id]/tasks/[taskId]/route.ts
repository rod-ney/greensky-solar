import { NextResponse } from "next/server";
import { deleteTaskInDb, updateTaskInDb } from "@/lib/server/projects-repository";
import { getTechnicianIdByUserId } from "@/lib/server/general-repository";
import { requireAdmin, requireAdminOrTechnician } from "@/lib/server/auth-guard";
import { createNotification, getAdminUserIds, getUserIdForTechnician } from "@/lib/notifications";
import { updateTaskSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string; taskId: string }>;
};

function debugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7747/ingest/ab001a91-7ef1-4a9f-a005-3fe6f98fe055",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"2fbc37"},body:JSON.stringify({sessionId:"2fbc37",runId:payload.runId,hypothesisId:payload.hypothesisId,location:payload.location,message:payload.message,data:payload.data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, updateTaskSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const { id: projectId, taskId } = await context.params;
    debugLog({
      runId: "initial",
      hypothesisId: "H1",
      location: "api/projects/[id]/tasks/[taskId]/route.ts:PATCH",
      message: "Task update request received",
      data: {
        role: auth.role,
        projectId,
        taskId,
        hasAssignedTo: body.assignedTo !== undefined,
        assignedToValue: body.assignedTo ?? null,
        hasDueDate: body.dueDate !== undefined,
      },
    });

    if (auth.role === "technician") {
      const technicianId = await getTechnicianIdByUserId(auth.userId);
      if (!technicianId) {
        return NextResponse.json({ error: "Technician profile not found" }, { status: 403 });
      }
      const { getProjectByIdFromDb } = await import("@/lib/server/projects-repository");
      const project = await getProjectByIdFromDb(projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      const task = project.tasks.find((t) => t.id === taskId);
      if (!task || task.assignedTo !== technicianId) {
        debugLog({
          runId: "initial",
          hypothesisId: "H3",
          location: "api/projects/[id]/tasks/[taskId]/route.ts:PATCH",
          message: "Technician authorization rejected",
          data: {
            technicianId,
            taskFound: Boolean(task),
            taskAssignedTo: task?.assignedTo ?? null,
          },
        });
        return NextResponse.json({ error: "Task not found or not assigned to you" }, { status: 403 });
      }
      if (body.assignedTo !== undefined || body.title !== undefined || body.description !== undefined || body.priority !== undefined || body.dueDate !== undefined) {
        return NextResponse.json({ error: "Technicians can only update task status" }, { status: 403 });
      }
      if (!body.status) {
        return NextResponse.json({ error: "status is required" }, { status: 400 });
      }
    }

    const updated = await updateTaskInDb(taskId, {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assignedTo: auth.role === "admin" ? body.assignedTo : undefined,
      dueDate: auth.role === "admin" ? body.dueDate : undefined,
    });
    debugLog({
      runId: "initial",
      hypothesisId: "H2",
      location: "api/projects/[id]/tasks/[taskId]/route.ts:PATCH",
      message: "Task update repository returned",
      data: {
        updatedFound: Boolean(updated),
        updatedAssignedTo: updated?.assignedTo ?? null,
        updatedDueDate: updated?.dueDate ?? null,
      },
    });
    if (!updated) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    if (body.status === "completed") {
      const adminIds = await getAdminUserIds();
      for (const adminId of adminIds) {
        await createNotification(
          adminId,
          "task_completed",
          "Task completed",
          `Task "${updated.title}" has been completed.`,
          `/projects/${projectId}`
        );
      }
    }
    if (body.assignedTo) {
      const techUserId = await getUserIdForTechnician(body.assignedTo);
      if (techUserId) {
        await createNotification(
          techUserId,
          "task_assigned",
          "Task assigned",
          `You have been assigned: ${updated.title}`,
          `/technician/projects/${projectId}`,
          { taskId: updated.id }
        );
      }
    }
    if (body.dueDate) {
      const techId = body.assignedTo ?? updated.assignedTo;
      if (techId) {
        const techUserId = await getUserIdForTechnician(techId);
        if (techUserId) {
          await createNotification(
            techUserId,
            "task_rescheduled",
            "Task rescheduled",
            `Task "${updated.title}" due date has been updated.`,
            `/technician/projects/${projectId}`
          );
        }
      }
    }
    return NextResponse.json(updated);
  } catch (error) {
    debugLog({
      runId: "initial",
      hypothesisId: "H1",
      location: "api/projects/[id]/tasks/[taskId]/route.ts:PATCH",
      message: "Task update failed with exception",
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const { taskId } = await context.params;
    const deleted = await deleteTaskInDb(taskId);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
