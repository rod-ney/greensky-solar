import { NextResponse } from "next/server";
import {
  deleteClientBookingInDb,
  getBookingStatusFromDb,
  updateClientBookingInDb,
  bookingBelongsToUser,
  getBookingUserId,
} from "@/lib/server/client-bookings-repository";
import { requireAdmin, requireAuth } from "@/lib/server/auth-guard";
import { isPastDateTime } from "@/lib/date-utils";
import { createNotification, getAdminUserIds } from "@/lib/notifications";
import { updateBookingSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  const isClient = auth.role !== "admin" && auth.role !== "technician";
  if (isClient) {
    const owns = await bookingBelongsToUser(id, auth.userId);
    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const result = await validateBody(request, updateBookingSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    if (isClient) {
      const currentStatus = await getBookingStatusFromDb(id);
      if (!currentStatus) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }
      if (currentStatus === "cancelled") {
        return NextResponse.json(
          { error: "This booking is already cancelled and can no longer be changed." },
          { status: 400 }
        );
      }
    }

    if (body.date && body.time && isPastDateTime(body.date, body.time)) {
      return NextResponse.json(
        { error: "Cannot reschedule to a date and time in the past." },
        { status: 400 }
      );
    }

    const updated = await updateClientBookingInDb(id, {
      serviceType: body.serviceType,
      date: body.date,
      endDate: body.endDate,
      time: body.time,
      status: body.status,
      technician: body.technician,
      address: body.address,
      notes: body.notes,
      amount: body.amount,
      lat: body.lat,
      lng: body.lng,
      addressId: body.addressId,
    });

    if (!updated) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (body.status) {
      const clientUserId = await getBookingUserId(id);
      const adminIds = await getAdminUserIds();
      if (body.status === "cancelled") {
        for (const adminId of adminIds) {
          await createNotification(
            adminId,
            "booking_cancelled",
            "Booking cancelled",
            `Booking ${updated.referenceNo} has been cancelled.`,
            "/bookings"
          );
        }
        if (clientUserId) {
          await createNotification(
            clientUserId,
            "booking_cancelled",
            "Booking cancelled",
            `Your booking ${updated.referenceNo} has been cancelled.`,
            "/client"
          );
        }
      } else if (body.status === "confirmed") {
        if (clientUserId) {
          await createNotification(
            clientUserId,
            "booking_confirmed",
            "Booking confirmed",
            `Your booking ${updated.referenceNo} has been confirmed.`,
            "/client"
          );
        }
      } else if (body.status === "completed") {
        for (const adminId of adminIds) {
          await createNotification(
            adminId,
            "booking_completed",
            "Booking completed",
            `Booking ${updated.referenceNo} has been completed.`,
            "/bookings"
          );
        }
        if (clientUserId) {
          await createNotification(
            clientUserId,
            "booking_completed",
            "Booking completed",
            `Your booking ${updated.referenceNo} has been completed.`,
            "/client"
          );
        }
      }
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
  try {
    const { id } = await context.params;
    const deleted = await deleteClientBookingInDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
