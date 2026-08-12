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
import { getBookingByReferenceOrId } from "@/lib/server/client-bookings-repository";

function mapBookingServiceType(serviceType?: string | null): string {
  switch (serviceType) {
    case "site_inspection":
      return "Site Inspection";
    case "solar_panel_installation":
      return "Solar Panel Installation";
    case "inverter_battery_setup":
      return "Inverter & Battery Setup";
    case "maintenance_repair":
      return "Maintenance & Repair";
    case "commissioning":
      return "Commissioning";
    case "cleaning":
      return "Cleaning";
    default:
      return serviceType?.trim() || "Solar Panel Installation";
  }
}

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
      bookingId?: string;
      bookingRef?: string;
    };

    const serviceTypeInput = body.serviceType?.trim();
    const amountInput = typeof body.amount === "number" ? body.amount : undefined;
    const dueDate = body.dueDate?.trim() || getTodayInManila();
    const paymentInstructions = body.paymentInstructions?.trim() || "You may pay via Cash, GCash, Bank Transfer, or Credit Card.";
    const clientUserId = body.clientUserId?.trim() || null;
    const bookingId = body.bookingId?.trim() || null;
    const bookingRef = body.bookingRef?.trim() || null;

    const invoiceNo = await getNextInvoiceNumber();
    let resolvedBookingRef = bookingRef ?? invoiceNo;
    let resolvedClientUserId = clientUserId;
    let resolvedServiceType = serviceTypeInput || "Solar Panel Installation";
    let resolvedAmount = amountInput ?? 0;

    if (bookingId || bookingRef) {
      const booking = await getBookingByReferenceOrId(bookingId ?? bookingRef!);
      if (booking) {
        resolvedBookingRef = booking.referenceNo;
        if (!resolvedClientUserId && booking.userId) {
          resolvedClientUserId = booking.userId;
        }
        if (!serviceTypeInput) {
          resolvedServiceType = mapBookingServiceType(booking.serviceType);
        }
        if (amountInput == null && booking.amount > 0) {
          resolvedAmount = booking.amount;
        }
      }
    }

    if (resolvedAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 }
      );
    }

    const payment = await createPaymentInDb({
      referenceNo: invoiceNo,
      bookingRef: resolvedBookingRef,
      description: `${resolvedServiceType} - Invoice ${invoiceNo}`,
      amount: resolvedAmount,
      method: "bank_transfer",
      dueDate,
      userId: resolvedClientUserId,
      serviceType: resolvedServiceType,
      paymentInstructions,
    });

    if (resolvedClientUserId) {
      const today = getTodayInManila();
      await addClientDocumentToDb(
        {
          title: `Invoice ${invoiceNo} - ${resolvedServiceType}`,
          type: "invoice",
          fileSize: "—",
          uploadedAt: today,
          projectName: undefined,
          status: "active",
          approvalStatus: "pending",
        },
        resolvedClientUserId
      );
    }

    return NextResponse.json(payment, { status: 201 });
  });
}
