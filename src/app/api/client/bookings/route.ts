import { NextResponse } from "next/server";
import {
  createClientBookingInDb,
  listClientBookingsFromDb,
} from "@/lib/server/client-bookings-repository";
import { requireClient } from "@/lib/server/auth-guard";
import { isPastDateTime } from "@/lib/date-utils";
import { executeWithIdempotency } from "@/lib/server/idempotency";
import { createNotification, getAdminUserIds } from "@/lib/notifications";
import { createBookingSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const bookings = await listClientBookingsFromDb(auth.userId);
    return NextResponse.json(bookings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  return executeWithIdempotency(request, async () => {
    const result = await validateBody(request, createBookingSchema);
    if (!result.success) return result.response;
    const body = result.data;

    if (isPastDateTime(body.date, body.time)) {
      return NextResponse.json(
        { error: "Cannot book a date and time in the past." },
        { status: 400 }
      );
    }

    const created = await createClientBookingInDb({
      serviceType: body.serviceType,
      date: body.date,
      endDate: body.endDate,
      time: body.time,
      address: body.address,
      notes: body.notes,
      technician: body.technician ?? "Unassigned",
      amount: body.amount,
      status: "pending",
      userId: auth.userId,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      addressId: body.addressId ?? null,
    });
    const adminIds = await getAdminUserIds();
    for (const adminId of adminIds) {
      await createNotification(
        adminId,
        "booking_submitted",
        "New booking submitted",
        `Booking ${created.referenceNo} for ${body.serviceType} on ${body.date}`,
        "/bookings"
      );
    }
    return NextResponse.json(created, { status: 201 });
  });
}
