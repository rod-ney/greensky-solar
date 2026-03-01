import { NextResponse } from "next/server";
import {
  createPaymentInDb,
  getNextInvoiceNumber,
  listInvoicesFromDb,
} from "@/lib/server/general-repository";
import { addClientDocumentToDb } from "@/lib/server/client-documents-repository";
import { getTodayInManila } from "@/lib/date-utils";
import { requireAdmin } from "@/lib/server/auth-guard";
import { executeWithIdempotency } from "@/lib/server/idempotency";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const invoices = await listInvoicesFromDb();
    return NextResponse.json(invoices);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  return executeWithIdempotency(request, async () => {
    const body = (await request.json()) as {
      serviceType?: string;
      amount?: number;
      dueDate?: string;
      paymentInstructions?: string;
      clientUserId?: string;
    };

    const serviceType = body.serviceType?.trim() || "Solar Panel Installation";
    const amount = typeof body.amount === "number" ? body.amount : 0;
    const dueDate = body.dueDate?.trim() || getTodayInManila();
    const paymentInstructions = body.paymentInstructions?.trim() || "You may pay via Cash, GCash, Bank Transfer, or Credit Card.";
    const clientUserId = body.clientUserId?.trim() || null;

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 }
      );
    }

    const invoiceNo = await getNextInvoiceNumber();

    const payment = await createPaymentInDb({
      referenceNo: invoiceNo,
      bookingRef: invoiceNo,
      description: `${serviceType} - Invoice ${invoiceNo}`,
      amount,
      method: "bank_transfer",
      dueDate,
      userId: clientUserId,
      serviceType,
      paymentInstructions,
    });

    if (clientUserId) {
      const today = getTodayInManila();
      await addClientDocumentToDb(
        {
          title: `Invoice ${invoiceNo} - ${serviceType}`,
          type: "invoice",
          fileSize: "—",
          uploadedAt: today,
          projectName: undefined,
          status: "active",
          approvalStatus: "pending",
        },
        clientUserId
      );
    }

    return NextResponse.json(payment, { status: 201 });
  });
}
