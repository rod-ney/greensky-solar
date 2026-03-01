import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth-guard";
import { removeProjectInventoryItem } from "@/lib/server/inventory-repository";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id, itemId } = await context.params;
    const removed = await removeProjectInventoryItem(id, itemId, auth.userId);
    if (!removed) {
      return NextResponse.json(
        { error: "Allocation not found." },
        { status: 404 }
      );
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
