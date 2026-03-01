import { NextResponse } from "next/server";
import {
  listInventoryFromDb,
  createInventoryItemInDb,
} from "@/lib/server/general-repository";
import { requireAdmin } from "@/lib/server/auth-guard";
import { createInventoryItemSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const items = await listInventoryFromDb();
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, createInventoryItemSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const created = await createInventoryItemInDb({
      name: body.name,
      sku: body.sku,
      category: body.category,
      quantity: body.quantity,
      minStock: body.minStock,
      unit: body.unit,
      unitPrice: body.unitPrice,
      location: body.location || "Warehouse A",
      supplier: body.supplier || "Unknown",
      description: body.description,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
