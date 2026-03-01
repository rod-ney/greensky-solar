import { NextResponse } from "next/server";
import {
  listTechniciansFromDb,
  createTechnicianInDb,
} from "@/lib/server/general-repository";
import { requireAdmin, requireAdminOrTechnician } from "@/lib/server/auth-guard";
import { createTechnicianSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const technicians = await listTechniciansFromDb();
    return NextResponse.json(technicians);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, createTechnicianSchema);
  if (!result.success) return result.response;
  const { userId, specialization } = result.data;
  try {
    const technician = await createTechnicianInDb({ userId, specialization });
    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("not found") ||
      message.includes("already has") ||
      message.includes("contact number")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
