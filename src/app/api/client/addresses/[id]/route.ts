import { NextResponse } from "next/server";
import {
  deleteSavedAddressInDb,
  setDefaultSavedAddressInDb,
  addressBelongsToUser,
} from "@/lib/server/general-repository";
import { requireClient } from "@/lib/server/auth-guard";
import { updateAddressSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, updateAddressSchema);
  if (!result.success) return result.response;
  try {
    const { id } = await context.params;
    const belongsToUser = await addressBelongsToUser(id, auth.userId);
    if (!belongsToUser) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }
    const updated = await setDefaultSavedAddressInDb(id, auth.userId);
    if (!updated) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const belongsToUser = await addressBelongsToUser(id, auth.userId);
    if (!belongsToUser) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }
    const deleted = await deleteSavedAddressInDb(id, auth.userId);
    if (!deleted) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
