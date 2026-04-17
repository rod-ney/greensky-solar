import { dbQuery } from "@/lib/server/db";
import { toIsoDateManila } from "@/lib/date-utils";
import type { Booking } from "@/types/client";

type BookingRow = {
  id: string;
  reference_no: string;
  client_name?: string | null;
  client_contact_number?: string | null;
  service_type: Booking["serviceType"];
  date: string | Date;
  end_date?: string | Date | null;
  time: string;
  status: Booking["status"];
  technician: string;
  project_lead_name?: string | null;
  project_id?: string | null;
  address: string;
  notes: string;
  amount: string | number;
  user_id?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  addr_lat?: string | number | null;
  addr_lng?: string | number | null;
};

function mapBooking(row: BookingRow): Booking {
  // Prefer saved_address pinned coords (addr_lat/addr_lng) over booking.lat/lng
  const lat =
    row.addr_lat != null ? Number(row.addr_lat) : row.lat != null ? Number(row.lat) : undefined;
  const lng =
    row.addr_lng != null ? Number(row.addr_lng) : row.lng != null ? Number(row.lng) : undefined;
  return {
    id: row.id,
    referenceNo: row.reference_no,
    clientName: row.client_name ?? undefined,
    clientContactNumber: row.client_contact_number ?? undefined,
    serviceType: row.service_type,
    date: toIsoDateManila(row.date),
    endDate: row.end_date ? toIsoDateManila(row.end_date) : undefined,
    time: row.time,
    status: row.status,
    technician: row.technician,
    projectLead: row.project_lead_name ?? undefined,
    address: row.address,
    notes: row.notes,
    amount: Number(row.amount),
    userId: row.user_id ?? undefined,
    lat,
    lng,
    projectId: row.project_id ?? undefined,
  };
}

export async function listClientBookingsFromDb(userId?: string | null): Promise<Booking[]> {
  const query = userId
    ? `
      SELECT b.id, b.reference_no, b.service_type, b.date, b.end_date, b.time, b.status, b.technician, b.address, b.notes, b.amount, b.lat, b.lng,
             COALESCE(
               (SELECT u.name FROM users u WHERE u.id = b.user_id LIMIT 1),
               (SELECT u2.name FROM projects p2 JOIN users u2 ON u2.id = p2.user_id WHERE p2.booking_id = b.id LIMIT 1)
             ) AS client_name,
             COALESCE(
               (SELECT u.contact_number FROM users u WHERE u.id = b.user_id LIMIT 1),
               (SELECT u2.contact_number FROM projects p2 JOIN users u2 ON u2.id = p2.user_id WHERE p2.booking_id = b.id LIMIT 1)
             ) AS client_contact_number,
             b.user_id,
             sa.lat AS addr_lat, sa.lng AS addr_lng,
             (SELECT t.name FROM projects p
              JOIN technicians t ON p.project_lead = t.id
              WHERE p.booking_id = b.id AND p.project_lead IS NOT NULL
              ORDER BY p.created_at DESC
              LIMIT 1) AS project_lead_name,
             (SELECT p.id FROM projects p
              WHERE p.booking_id = b.id
              ORDER BY p.created_at DESC
              LIMIT 1) AS project_id
      FROM bookings b
      LEFT JOIN saved_addresses sa ON b.address_id = sa.id
      LEFT JOIN projects p ON p.booking_id = b.id
      WHERE b.user_id = $1 OR p.user_id = $1
      ORDER BY b.date DESC, b.time DESC
    `
    : `
      SELECT b.id, b.reference_no, b.service_type, b.date, b.end_date, b.time, b.status, b.technician, b.address, b.notes, b.amount, b.lat, b.lng,
             COALESCE(
               (SELECT u.name FROM users u WHERE u.id = b.user_id LIMIT 1),
               (SELECT u2.name FROM projects p2 JOIN users u2 ON u2.id = p2.user_id WHERE p2.booking_id = b.id LIMIT 1)
             ) AS client_name,
             COALESCE(
               (SELECT u.contact_number FROM users u WHERE u.id = b.user_id LIMIT 1),
               (SELECT u2.contact_number FROM projects p2 JOIN users u2 ON u2.id = p2.user_id WHERE p2.booking_id = b.id LIMIT 1)
             ) AS client_contact_number,
             b.user_id,
             sa.lat AS addr_lat, sa.lng AS addr_lng,
             (SELECT t.name FROM projects p
              JOIN technicians t ON p.project_lead = t.id
              WHERE p.booking_id = b.id AND p.project_lead IS NOT NULL
              ORDER BY p.created_at DESC
              LIMIT 1) AS project_lead_name,
             (SELECT p.id FROM projects p
              WHERE p.booking_id = b.id
              ORDER BY p.created_at DESC
              LIMIT 1) AS project_id
      FROM bookings b
      LEFT JOIN saved_addresses sa ON b.address_id = sa.id
      ORDER BY b.date DESC, b.time DESC
    `;
  const result = await dbQuery<BookingRow>(query, userId ? [userId] : []);
  return result.rows.map(mapBooking);
}

export async function createClientBookingInDb(data: {
  serviceType: Booking["serviceType"];
  date: string;
  endDate?: string | null;
  time: string;
  address: string;
  notes: string;
  technician?: string;
  amount?: number;
  status?: Booking["status"];
  userId?: string | null;
  lat?: number | null;
  lng?: number | null;
  addressId?: string | null;
}): Promise<Booking> {
  const seqResult = await dbQuery<{ n: string }>(
    "SELECT nextval('bookings_ref_seq')::text AS n"
  );
  const nextNumber = seqResult.rows[0]?.n ?? "1";
  const nextId = `book-${crypto.randomUUID()}`;
  const referenceNo = `BK-${String(nextNumber).padStart(4, "0")}`;

  const result = await dbQuery<BookingRow>(
    `INSERT INTO bookings
      (id, reference_no, service_type, date, end_date, time, status, technician, address, notes, amount, user_id, lat, lng, address_id)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id, reference_no, service_type, date, end_date, time, status, technician, address, notes, amount, lat, lng`,
    [
      nextId,
      referenceNo,
      data.serviceType,
      data.date,
      data.endDate ?? null,
      data.time,
      data.status ?? "pending",
      data.technician ?? "Unassigned",
      data.address,
      data.notes,
      data.amount ?? 0,
      data.userId ?? null,
      data.lat ?? null,
      data.lng ?? null,
      data.addressId ?? null,
    ]
  );

  return mapBooking(result.rows[0]);
}

export async function createSolarInstallationBookingInDb(data: {
  date: string;
  endDate?: string;
  time: string;
  address: string;
  notes: string;
  technician?: string;
  amount?: number;
  userId: string;
}): Promise<Booking> {
  return createClientBookingInDb({
    serviceType: "solar_panel_installation",
    date: data.date,
    endDate: data.endDate,
    time: data.time,
    address: data.address,
    notes: data.notes,
    technician: data.technician ?? "Unassigned",
    amount: data.amount ?? 0,
    status: "pending",
    userId: data.userId,
  });
}

export async function updateClientBookingInDb(
  id: string,
  data: {
    serviceType?: Booking["serviceType"];
    date?: string;
    endDate?: string | null;
    time?: string;
    status?: Booking["status"];
    technician?: string;
    address?: string;
    notes?: string;
    amount?: number;
    lat?: number | null;
    lng?: number | null;
    addressId?: string | null;
  }
): Promise<Booking | null> {
  const latProvided = "lat" in data;
  const lngProvided = "lng" in data;
  const addressIdProvided = "addressId" in data;
  const params = [
    id,
    data.serviceType ?? null,
    data.date ?? null,
    data.endDate ?? null,
    data.time ?? null,
    data.status ?? null,
    data.technician ?? null,
    data.address ?? null,
    data.notes ?? null,
    typeof data.amount === "number" ? data.amount : null,
  ];
  let paramIdx = 11;
  const latClause = latProvided ? `$${paramIdx++}` : "lat";
  const lngClause = lngProvided ? `$${paramIdx++}` : "lng";
  const addressIdClause = addressIdProvided ? `$${paramIdx}` : "address_id";
  if (latProvided) params.push(data.lat ?? null);
  if (lngProvided) params.push(data.lng ?? null);
  if (addressIdProvided) params.push(data.addressId ?? null);

  const result = await dbQuery<BookingRow>(
    `UPDATE bookings
     SET
       service_type = COALESCE($2, service_type),
       date = COALESCE($3::date, date),
       end_date = COALESCE($4::date, end_date),
       time = COALESCE($5, time),
       status = COALESCE($6, status),
       technician = COALESCE($7, technician),
       address = COALESCE($8, address),
       notes = COALESCE($9, notes),
       amount = COALESCE($10, amount),
       lat = ${latClause},
       lng = ${lngClause},
       address_id = ${addressIdClause}
     WHERE id = $1
     RETURNING id, reference_no, service_type, date, end_date, time, status, technician, address, notes, amount, lat, lng`,
    params
  );

  const row = result.rows[0];
  if (!row) return null;
  return mapBooking(row);
}

export async function deleteClientBookingInDb(id: string): Promise<boolean> {
  const result = await dbQuery<{ id: string }>(
    "DELETE FROM bookings WHERE id = $1 RETURNING id",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getBookingUserId(bookingId: string): Promise<string | null> {
  const result = await dbQuery<{ user_id: string | null; project_user_id: string | null }>(
    `SELECT b.user_id,
            (SELECT p.user_id FROM projects p WHERE p.booking_id = b.id LIMIT 1) AS project_user_id
     FROM bookings b WHERE b.id = $1`,
    [bookingId]
  );
  const row = result.rows[0];
  return row?.user_id ?? row?.project_user_id ?? null;
}

export async function bookingBelongsToUser(
  bookingId: string,
  userId: string
): Promise<boolean> {
  const result = await dbQuery<{ n: number }>(
    `SELECT 1 AS n FROM bookings b
     LEFT JOIN projects p ON p.booking_id = b.id
     WHERE b.id = $1 AND (b.user_id = $2 OR p.user_id = $2)
     LIMIT 1`,
    [bookingId, userId]
  );
  return result.rows.length > 0;
}
