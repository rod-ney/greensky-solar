import { NextResponse } from "next/server";
import { requireAdmin, requireAdminOrTechnician } from "@/lib/server/auth-guard";
import {
  getProjectInventory,
  allocateInventoryToProject,
} from "@/lib/server/inventory-repository";
import { allocateInventorySchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const items = await getProjectInventory(id);
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, allocateInventorySchema);
  if (!result.success) return result.response;
  const { items } = result.data;
  try {
    const { id } = await context.params;

    const allocated = await allocateInventoryToProject(id, items, auth.userId);
    return NextResponse.json(allocated, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.startsWith("Insufficient stock") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
