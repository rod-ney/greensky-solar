import { NextResponse } from "next/server";
import {
  updateUserRoleInDb,
  updateUserContactInDb,
  deleteUserFromDb,
} from "@/lib/server/general-repository";
import { requireAdmin } from "@/lib/server/auth-guard";
import { updateUserSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    if (id === auth.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }
    const deleted = await deleteUserFromDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, updateUserSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const { id } = await context.params;

    let updated = null;
    if (body.role !== undefined) {
      updated = await updateUserRoleInDb({ userId: id, role: body.role });
    }
    if (body.contactNumber !== undefined) {
      updated = await updateUserContactInDb({
        userId: id,
        contactNumber: body.contactNumber,
      });
    }

    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
