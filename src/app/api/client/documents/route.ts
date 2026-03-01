import { NextResponse } from "next/server";
import {
  addClientDocumentToDb,
  listClientDocumentsFromDb,
} from "@/lib/server/client-documents-repository";
import { requireClient } from "@/lib/server/auth-guard";
import { createDocumentSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const documents = await listClientDocumentsFromDb(auth.userId);
    return NextResponse.json(documents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, createDocumentSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const created = await addClientDocumentToDb(body, auth.userId);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
