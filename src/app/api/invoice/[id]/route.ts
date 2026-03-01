import { NextResponse } from "next/server";
import {
  getPaymentById,
  updatePaymentInDb,
  deletePaymentInDb,
} from "@/lib/server/general-repository";
import { requireAdmin } from "@/lib/server/auth-guard";
import { updateInvoiceSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const payment = await getPaymentById(id);
  if (!payment) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (!payment.referenceNo.startsWith("INV-")) {
    return NextResponse.json({ error: "Not an invoice." }, { status: 400 });
  }
  const result = await validateBody(request, updateInvoiceSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const updated = await updatePaymentInDb(id, {
      amount: body.amount,
      dueDate: body.dueDate,
      status: body.status,
      serviceType: body.serviceType,
      paymentInstructions: body.paymentInstructions,
      userId: body.clientUserId !== undefined ? body.clientUserId : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "Failed to update invoice." }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const payment = await getPaymentById(id);
  if (!payment) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (!payment.referenceNo.startsWith("INV-")) {
    return NextResponse.json({ error: "Not an invoice." }, { status: 400 });
  }
  try {
    const deleted = await deletePaymentInDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete invoice." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
