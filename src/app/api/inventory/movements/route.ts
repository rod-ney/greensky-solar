import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth-guard";
import { listInventoryMovements } from "@/lib/server/inventory-repository";
import type { InventoryMovementType } from "@/types";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const url = new URL(request.url);
    const inventoryItemId = url.searchParams.get("itemId") || undefined;
    const projectId = url.searchParams.get("projectId") || undefined;
    const movementType =
      (url.searchParams.get("type") as InventoryMovementType) || undefined;
    const limit = url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined;
    const offset = url.searchParams.get("offset")
      ? Number(url.searchParams.get("offset"))
      : undefined;

    const result = await listInventoryMovements({
      inventoryItemId,
      projectId,
      movementType,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
