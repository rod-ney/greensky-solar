import { NextResponse } from "next/server";
import { createTaskInDb } from "@/lib/server/projects-repository";
import { requireAdmin } from "@/lib/server/auth-guard";
import { createNotification, getUserIdForTechnician } from "@/lib/notifications";
import { createTaskSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, createTaskSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const { id } = await context.params;

    const created = await createTaskInDb({
      projectId: id,
      title: body.title,
      description: body.description,
      priority: body.priority,
      assignedTo: body.assignedTo ?? "",
      dueDate: body.dueDate,
    });

    const techUserId = body.assignedTo
      ? await getUserIdForTechnician(body.assignedTo)
      : null;
    if (techUserId) {
      await createNotification(
        techUserId,
        "task_assigned",
        "Task assigned",
        `You have been assigned: ${body.title}`,
        `/technician/projects/${id}`,
        { taskId: created.id }
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
