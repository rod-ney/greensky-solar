import { dbQuery } from "@/lib/server/db";
import { toIsoDateManila, getTodayInManila } from "@/lib/date-utils";
import type {
  CalendarEvent,
  InventoryItem,
  Report,
  SupportTicket,
  Technician,
  User,
} from "@/types";
import type { Payment, SavedAddress } from "@/types/client";

type TechnicianRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  specialization: string;
  rating: string | number;
  projects_completed: number;
  active_projects: number;
  status: Technician["status"];
  join_date: string | Date;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  contact_number: string | null;
  role: User["role"];
  avatar: string;
  status: User["status"];
  last_login: string | Date | null;
  created_at: string | Date;
};

type AuthUserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: User["role"];
};

type ReportRow = {
  id: string;
  title: string;
  type: Report["type"];
  status: Report["status"];
  submitted_by: string;
  submitted_at: string | Date;
  project_id: string | null;
  project_name: string | null;
  amount: string | number | null;
  description: string;
  client_approval_status: "pending" | "approved" | "rejected" | null;
};

type CalendarRow = {
  id: string;
  title: string;
  date: string | Date;
  end_date: string | Date | null;
  type: CalendarEvent["type"];
  project_id: string | null;
  project_name: string | null;
  color: string;
};

type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  category: InventoryItem["category"];
  quantity: number;
  min_stock: number;
  unit: string;
  unit_price: string | number;
  location: string;
  supplier: string;
  status: InventoryItem["status"];
  last_restocked: string | Date;
  description: string;
};

type PaymentRow = {
  id: string;
  reference_no: string;
  booking_ref: string;
  description: string;
  amount: string | number;
  status: Payment["status"];
  method: Payment["method"];
  date: string | Date;
  due_date: string | Date | null;
  user_id: string | null;
  service_type: string | null;
  payment_instructions: string | null;
};

type AddressRow = {
  id: string;
  label: string;
  full_address: string;
  city: string;
  province: string;
  zip_code: string;
  lat: number;
  lng: number;
  is_default: boolean;
  monthly_bill: string | number;
};

type ApplianceRow = {
  id: string;
  address_id: string;
  name: string;
  quantity: number;
  wattage: number;
};

export async function listTechniciansFromDb(): Promise<Technician[]> {
  const result = await dbQuery<
    TechnicianRow & { projects_completed: string; active_projects: string }
  >(
    `SELECT t.id, t.user_id, t.name, t.email, t.phone, t.avatar, t.specialization, t.rating, t.status, t.join_date,
       COALESCE((
         SELECT COUNT(DISTINCT p.id) FROM projects p
         WHERE p.status = 'completed'
         AND (
           EXISTS (SELECT 1 FROM project_technicians pt WHERE pt.project_id = p.id AND pt.technician_id = t.id)
           OR p.project_lead = t.id
         )
       ), 0)::text AS projects_completed,
       COALESCE((
         SELECT COUNT(DISTINCT p.id) FROM projects p
         WHERE p.status IN ('ongoing', 'pending')
         AND (
           EXISTS (SELECT 1 FROM project_technicians pt WHERE pt.project_id = p.id AND pt.technician_id = t.id)
           OR p.project_lead = t.id
         )
       ), 0)::text AS active_projects
     FROM technicians t
     ORDER BY t.name ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    specialization: row.specialization,
    rating: Number(row.rating),
    projectsCompleted: Number(row.projects_completed) || 0,
    activeProjects: Number(row.active_projects) || 0,
    status: row.status,
    joinDate: toIsoDateManila(row.join_date),
  }));
}

export async function createTechnicianInDb(data: {
  userId: string;
  specialization: string;
}): Promise<Technician> {
  const userResult = await dbQuery<UserRow>(
    `SELECT id, name, email, contact_number, avatar
     FROM users WHERE id = $1`,
    [data.userId]
  );
  const user = userResult.rows[0];
  if (!user) {
    throw new Error("User not found.");
  }
  const contactNum = user.contact_number ?? "";
  if (contactNum.length !== 10 || !/^\d{10}$/.test(contactNum)) {
    throw new Error(
      "User must have a contact number (10 digits) in User Management."
    );
  }
  const phone = `+63 ${contactNum}`;
  const existingTech = await dbQuery<{ id: string }>(
    `SELECT id FROM technicians WHERE user_id = $1`,
    [data.userId]
  );
  if (existingTech.rows.length > 0) {
    throw new Error("This user already has a technician profile.");
  }

  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM technicians"
  );
  const nextId = `tech-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;
  const today = getTodayInManila();

  await dbQuery(
    `INSERT INTO technicians (id, user_id, name, email, phone, avatar, specialization, rating, projects_completed, active_projects, status, join_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 'available', $8::date)`,
    [
      nextId,
      data.userId,
      user.name,
      user.email,
      phone,
      user.avatar,
      data.specialization,
      today,
    ]
  );

  const list = await listTechniciansFromDb();
  const created = list.find((t) => t.id === nextId);
  if (!created) {
    throw new Error("Technician created but could not be retrieved.");
  }
  return created;
}

export async function getTechnicianIdByUserId(userId: string): Promise<string | null> {
  const result = await dbQuery<{ id: string }>(
    `SELECT id FROM technicians WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id ?? null;
}

export async function getTechnicianByUserId(userId: string): Promise<Technician | null> {
  const result = await dbQuery<
    TechnicianRow & { projects_completed: string; active_projects: string }
  >(
    `SELECT t.id, t.user_id, t.name, t.email, t.phone, t.avatar, t.specialization, t.rating, t.status, t.join_date,
       COALESCE((
         SELECT COUNT(DISTINCT p.id) FROM projects p
         WHERE p.status = 'completed'
         AND (
           EXISTS (SELECT 1 FROM project_technicians pt WHERE pt.project_id = p.id AND pt.technician_id = t.id)
           OR p.project_lead = t.id
         )
       ), 0)::text AS projects_completed,
       COALESCE((
         SELECT COUNT(DISTINCT p.id) FROM projects p
         WHERE p.status IN ('ongoing', 'pending')
         AND (
           EXISTS (SELECT 1 FROM project_technicians pt WHERE pt.project_id = p.id AND pt.technician_id = t.id)
           OR p.project_lead = t.id
         )
       ), 0)::text AS active_projects
     FROM technicians t
     WHERE t.user_id = $1
     LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    specialization: row.specialization,
    rating: Number(row.rating),
    projectsCompleted: Number(row.projects_completed) || 0,
    activeProjects: Number(row.active_projects) || 0,
    status: row.status,
    joinDate: toIsoDateManila(row.join_date),
  };
}

export async function listUsersFromDb(): Promise<User[]> {
  const result = await dbQuery<UserRow>(
    `SELECT id, name, email, contact_number, role, avatar, status, last_login, created_at
     FROM users ORDER BY created_at DESC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    contactNumber: row.contact_number ?? undefined,
    role: row.role,
    avatar: row.avatar,
    status: row.status,
    lastLogin: row.last_login ? new Date(row.last_login).toISOString() : "",
    createdAt: toIsoDateManila(row.created_at),
  }));
}

export async function getAuthUserByEmailFromDb(
  email: string
): Promise<AuthUserRow | null> {
  const result = await dbQuery<AuthUserRow>(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE LOWER(email) = LOWER($1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function getAuthUserByIdAndEmailFromDb(
  id: string,
  email: string
): Promise<{ id: string; name: string; email: string; role: User["role"] } | null> {
  const result = await dbQuery<{ id: string; name: string; email: string; role: User["role"] }>(
    `SELECT id, name, email, role
     FROM users
     WHERE id = $1 AND LOWER(email) = LOWER($2) AND status = 'active'
     LIMIT 1`,
    [id, email]
  );
  return result.rows[0] ?? null;
}

function isValidContactNumber(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export async function createUserInDb(data: {
  name: string;
  email: string;
  passwordHash: string;
  contactNumber: string;
}): Promise<{ id: string; name: string; email: string }> {
  if (!isValidContactNumber(data.contactNumber)) {
    throw new Error("Contact number must be exactly 10 digits.");
  }

  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users"
  );
  const nextId = `user-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;
  const avatar = data.name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const result = await dbQuery<{ id: string; name: string; email: string }>(
    `INSERT INTO users (id, name, email, password_hash, contact_number, role, avatar, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'client', $6, 'active', NOW())
     RETURNING id, name, email`,
    [nextId, data.name, data.email, data.passwordHash, data.contactNumber, avatar]
  );
  return result.rows[0];
}

export async function updateUserRoleInDb(data: {
  userId: string;
  role: User["role"];
}): Promise<User | null> {
  const result = await dbQuery<UserRow>(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id, name, email, contact_number, role, avatar, status, last_login, created_at`,
    [data.userId, data.role]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    contactNumber: row.contact_number ?? undefined,
    role: row.role,
    avatar: row.avatar,
    status: row.status,
    lastLogin: row.last_login ? new Date(row.last_login).toISOString() : "",
    createdAt: toIsoDateManila(row.created_at),
  };
}

export async function updateUserContactInDb(data: {
  userId: string;
  contactNumber: string | null;
}): Promise<User | null> {
  if (
    data.contactNumber !== null &&
    !isValidContactNumber(data.contactNumber)
  ) {
    throw new Error("Contact number must be exactly 10 digits.");
  }

  const result = await dbQuery<UserRow>(
    `UPDATE users
     SET contact_number = $2
     WHERE id = $1
     RETURNING id, name, email, contact_number, role, avatar, status, last_login, created_at`,
    [data.userId, data.contactNumber]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    contactNumber: row.contact_number ?? undefined,
    role: row.role,
    avatar: row.avatar,
    status: row.status,
    lastLogin: row.last_login ? new Date(row.last_login).toISOString() : "",
    createdAt: toIsoDateManila(row.created_at),
  };
}

export async function deleteUserFromDb(userId: string): Promise<boolean> {
  const result = await dbQuery(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listReportsFromDb(): Promise<Report[]> {
  const result = await dbQuery<ReportRow>(
    `SELECT r.id, r.title, r.type, r.status, r.submitted_by, r.submitted_at,
            r.project_id, r.project_name, r.amount, r.description,
            (SELECT CASE
              WHEN EXISTS (SELECT 1 FROM documents d WHERE d.report_id = r.id AND d.approval_status = 'approved') THEN 'approved'
              WHEN EXISTS (SELECT 1 FROM documents d WHERE d.report_id = r.id AND d.approval_status = 'rejected') THEN 'rejected'
              WHEN EXISTS (SELECT 1 FROM documents d WHERE d.report_id = r.id AND d.approval_status = 'pending') THEN 'pending'
              ELSE NULL
            END) AS client_approval_status
     FROM reports r ORDER BY r.submitted_at DESC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: toIsoDateManila(row.submitted_at),
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    amount: row.amount !== null ? Number(row.amount) : undefined,
    description: row.description,
    clientApprovalStatus: row.client_approval_status ?? undefined,
  }));
}

export async function getReportByIdFromDb(id: string): Promise<Report | null> {
  const result = await dbQuery<ReportRow>(
    `SELECT id, title, type, status, submitted_by, submitted_at, project_id, project_name, amount, description
     FROM reports WHERE id = $1 LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: toIsoDateManila(row.submitted_at),
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    amount: row.amount !== null ? Number(row.amount) : undefined,
    description: row.description,
  };
}

export async function createReportInDb(data: {
  title: string;
  type: Report["type"];
  status?: Report["status"];
  submittedBy: string;
  submittedAt: string;
  projectId?: string;
  projectName?: string;
  amount?: number;
  description: string;
}): Promise<Report> {
  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM reports"
  );
  const nextId = `rep-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;

  const result = await dbQuery<ReportRow>(
    `INSERT INTO reports
      (id, title, type, status, submitted_by, submitted_at, project_id, project_name, amount, description)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, title, type, status, submitted_by, submitted_at, project_id, project_name, amount, description`,
    [
      nextId,
      data.title,
      data.type,
      data.status ?? "pending",
      data.submittedBy,
      data.submittedAt,
      data.projectId ?? null,
      data.projectName ?? null,
      typeof data.amount === "number" ? data.amount : null,
      data.description,
    ]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: toIsoDateManila(row.submitted_at),
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    amount: row.amount !== null ? Number(row.amount) : undefined,
    description: row.description,
  };
}

export async function updateReportStatusInDb(
  id: string,
  status: Report["status"]
): Promise<Report | null> {
  const result = await dbQuery<ReportRow>(
    `UPDATE reports
     SET status = $2
     WHERE id = $1
     RETURNING id, title, type, status, submitted_by, submitted_at, project_id, project_name, amount, description`,
    [id, status]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: toIsoDateManila(row.submitted_at),
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    amount: row.amount !== null ? Number(row.amount) : undefined,
    description: row.description,
  };
}

export async function updateReportInDb(
  id: string,
  data: {
    title?: string;
    description?: string;
    amount?: number | null;
    projectId?: string | null;
    projectName?: string | null;
  }
): Promise<Report | null> {
  const sets: string[] = [];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.title !== undefined) {
    sets.push(`title = $${idx++}`);
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push(`description = $${idx++}`);
    params.push(data.description);
  }
  if (data.amount !== undefined) {
    sets.push(`amount = $${idx++}`);
    params.push(data.amount);
  }
  if (data.projectId !== undefined) {
    sets.push(`project_id = $${idx++}`);
    params.push(data.projectId);
  }
  if (data.projectName !== undefined) {
    sets.push(`project_name = $${idx++}`);
    params.push(data.projectName);
  }

  if (sets.length === 0) return null;

  const result = await dbQuery<ReportRow>(
    `UPDATE reports
     SET ${sets.join(", ")}
     WHERE id = $1
     RETURNING id, title, type, status, submitted_by, submitted_at, project_id, project_name, amount, description`,
    params
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: toIsoDateManila(row.submitted_at),
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    amount: row.amount !== null ? Number(row.amount) : undefined,
    description: row.description,
  };
}

export async function deleteReportFromDb(id: string): Promise<boolean> {
  const result = await dbQuery(
    "DELETE FROM reports WHERE id = $1 RETURNING id",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listCalendarEventsFromDb(): Promise<CalendarEvent[]> {
  const result = await dbQuery<CalendarRow>(
    `SELECT id, title, date, end_date, type, project_id, project_name, color
     FROM calendar_events ORDER BY date ASC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: toIsoDateManila(row.date),
    endDate: row.end_date ? toIsoDateManila(row.end_date) : undefined,
    type: row.type,
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    color: row.color,
  }));
}

function computeInventoryStatus(quantity: number, minStock: number): InventoryItem["status"] {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= minStock) return "low_stock";
  return "in_stock";
}

export async function listInventoryFromDb(): Promise<InventoryItem[]> {
  const result = await dbQuery<InventoryRow>(
    `SELECT id, name, sku, category, quantity, min_stock, unit, unit_price, location, supplier, status, last_restocked, description
     FROM inventory_items ORDER BY name ASC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    quantity: row.quantity,
    minStock: row.min_stock,
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    location: row.location,
    supplier: row.supplier,
    status: row.status,
    lastRestocked: toIsoDateManila(row.last_restocked),
    description: row.description,
  }));
}

export async function createInventoryItemInDb(data: {
  name: string;
  sku: string;
  category: InventoryItem["category"];
  quantity: number;
  minStock: number;
  unit: string;
  unitPrice: number;
  location: string;
  supplier: string;
  description: string;
}): Promise<InventoryItem> {
  const skuCheck = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM inventory_items WHERE LOWER(sku) = LOWER($1)",
    [data.sku.trim()]
  );
  if (Number(skuCheck.rows[0]?.count ?? "0") > 0) {
    throw new Error("SKU already exists.");
  }

  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM inventory_items"
  );
  const nextId = `inv-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;
  const today = getTodayInManila();
  const status = computeInventoryStatus(data.quantity, data.minStock);

  await dbQuery(
    `
      INSERT INTO inventory_items (id, name, sku, category, quantity, min_stock, unit, unit_price, location, supplier, status, last_restocked, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
    [
      nextId,
      data.name.trim(),
      data.sku.trim(),
      data.category,
      data.quantity,
      data.minStock,
      data.unit.trim() || "pcs",
      data.unitPrice,
      data.location.trim() || "Warehouse A",
      data.supplier.trim() || "Unknown",
      status,
      today,
      data.description.trim() || "",
    ]
  );

  const result = await dbQuery<InventoryRow>(
    `SELECT id, name, sku, category, quantity, min_stock, unit, unit_price, location, supplier, status, last_restocked, description
     FROM inventory_items WHERE id = $1 LIMIT 1`,
    [nextId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Inventory item was created but could not be read back.");
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    quantity: row.quantity,
    minStock: row.min_stock,
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    location: row.location,
    supplier: row.supplier,
    status: row.status,
    lastRestocked: toIsoDateManila(row.last_restocked),
    description: row.description,
  };
}

export async function listPaymentsFromDb(userId?: string | null): Promise<Payment[]> {
  const query = userId
    ? `SELECT id, reference_no, booking_ref, description, amount, status, method, date, due_date, user_id, service_type, payment_instructions
       FROM payments WHERE user_id = $1 ORDER BY date DESC`
    : `SELECT id, reference_no, booking_ref, description, amount, status, method, date, due_date, user_id, service_type, payment_instructions
       FROM payments ORDER BY date DESC`;
  const result = await dbQuery<PaymentRow>(query, userId ? [userId] : []);
  return result.rows.map((row) => ({
    id: row.id,
    referenceNo: row.reference_no,
    bookingRef: row.booking_ref,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    date: toIsoDateManila(row.date),
    dueDate: row.due_date ? toIsoDateManila(row.due_date) : undefined,
    serviceType: row.service_type ?? undefined,
    paymentInstructions: row.payment_instructions ?? undefined,
  }));
}

export async function createPaymentInDb(data: {
  referenceNo: string;
  bookingRef: string;
  description: string;
  amount: number;
  method: Payment["method"];
  dueDate: string;
  userId?: string | null;
  serviceType?: string;
  paymentInstructions?: string;
}): Promise<Payment> {
  const countResult = await dbQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM payments");
  const nextId = `pay-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;
  const today = getTodayInManila();

  const result = await dbQuery<PaymentRow>(
    `INSERT INTO payments (id, reference_no, booking_ref, description, amount, status, method, date, due_date, user_id, service_type, payment_instructions)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7::date, $8::date, $9, $10, $11)
     RETURNING id, reference_no, booking_ref, description, amount, status, method, date, due_date, user_id, service_type, payment_instructions`,
    [
      nextId,
      data.referenceNo,
      data.bookingRef,
      data.description,
      data.amount,
      data.method,
      today,
      data.dueDate,
      data.userId ?? null,
      data.serviceType ?? null,
      data.paymentInstructions ?? null,
    ]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    referenceNo: row.reference_no,
    bookingRef: row.booking_ref,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    date: toIsoDateManila(row.date),
    dueDate: row.due_date ? toIsoDateManila(row.due_date) : undefined,
    serviceType: row.service_type ?? undefined,
    paymentInstructions: row.payment_instructions ?? undefined,
  };
}

export async function getNextInvoiceNumber(): Promise<string> {
  const result = await dbQuery<{ n: string }>("SELECT nextval('payments_ref_seq')::text AS n");
  const n = result.rows[0]?.n ?? "1";
  return `INV-${String(n).padStart(4, "0")}`;
}

export type InvoiceForAdmin = Payment & { clientName?: string; userId?: string };

export async function listInvoicesFromDb(): Promise<InvoiceForAdmin[]> {
  const result = await dbQuery<
    PaymentRow & { client_name: string | null }
  >(
    `SELECT p.id, p.reference_no, p.booking_ref, p.description, p.amount, p.status, p.method, p.date, p.due_date, p.user_id, p.service_type, p.payment_instructions, u.name as client_name
     FROM payments p
     LEFT JOIN users u ON p.user_id = u.id
     WHERE p.reference_no LIKE 'INV-%'
     ORDER BY p.date DESC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    referenceNo: row.reference_no,
    bookingRef: row.booking_ref,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    date: toIsoDateManila(row.date),
    dueDate: row.due_date ? toIsoDateManila(row.due_date) : undefined,
    serviceType: row.service_type ?? undefined,
    paymentInstructions: row.payment_instructions ?? undefined,
    clientName: row.client_name ?? undefined,
    userId: row.user_id ?? undefined,
  }));
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const result = await dbQuery<PaymentRow>(
    `SELECT id, reference_no, booking_ref, description, amount, status, method, date, due_date, user_id, service_type, payment_instructions
     FROM payments WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    referenceNo: row.reference_no,
    bookingRef: row.booking_ref,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    date: toIsoDateManila(row.date),
    dueDate: row.due_date ? toIsoDateManila(row.due_date) : undefined,
    serviceType: row.service_type ?? undefined,
    paymentInstructions: row.payment_instructions ?? undefined,
  };
}

export async function updatePaymentInDb(
  id: string,
  data: {
    amount?: number;
    dueDate?: string;
    status?: Payment["status"];
    serviceType?: string;
    paymentInstructions?: string;
    userId?: string | null;
  }
): Promise<Payment | null> {
  const updates: string[] = [];
  const params: unknown[] = [id];
  let i = 2;
  if (data.amount !== undefined) {
    updates.push(`amount = $${i++}`);
    params.push(data.amount);
  }
  if (data.dueDate !== undefined) {
    updates.push(`due_date = $${i++}::date`);
    params.push(data.dueDate);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${i++}`);
    params.push(data.status);
  }
  if (data.serviceType !== undefined) {
    updates.push(`service_type = $${i++}`);
    params.push(data.serviceType);
  }
  if (data.paymentInstructions !== undefined) {
    updates.push(`payment_instructions = $${i++}`);
    params.push(data.paymentInstructions);
  }
  if (data.userId !== undefined) {
    updates.push(`user_id = $${i++}`);
    params.push(data.userId);
  }
  if (updates.length === 0) return getPaymentById(id);
  const result = await dbQuery<PaymentRow>(
    `UPDATE payments SET ${updates.join(", ")} WHERE id = $1
     RETURNING id, reference_no, booking_ref, description, amount, status, method, date, due_date, user_id, service_type, payment_instructions`,
    params
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    referenceNo: row.reference_no,
    bookingRef: row.booking_ref,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    date: toIsoDateManila(row.date),
    dueDate: row.due_date ? toIsoDateManila(row.due_date) : undefined,
    serviceType: row.service_type ?? undefined,
    paymentInstructions: row.payment_instructions ?? undefined,
  };
}

export async function deletePaymentInDb(id: string): Promise<boolean> {
  const result = await dbQuery<{ id: string }>("DELETE FROM payments WHERE id = $1 RETURNING id", [id]);
  return result.rows.length > 0;
}

export async function listSavedAddressesFromDb(userId: string): Promise<SavedAddress[]> {
  const [addressResult, applianceResult] = await Promise.all([
    dbQuery<AddressRow>(
      `SELECT id, label, full_address, city, province, zip_code, lat, lng, is_default, monthly_bill
       FROM saved_addresses WHERE user_id = $1 ORDER BY is_default DESC, id ASC`,
      [userId]
    ),
    dbQuery<ApplianceRow>(
      `SELECT a.id, a.address_id, a.name, a.quantity, a.wattage
       FROM appliances a
       JOIN saved_addresses sa ON a.address_id = sa.id AND sa.user_id = $1
       ORDER BY a.id ASC`,
      [userId]
    ),
  ]);

  const applianceMap: Record<string, SavedAddress["appliances"]> = {};
  for (const row of applianceResult.rows) {
    applianceMap[row.address_id] = applianceMap[row.address_id] ?? [];
    applianceMap[row.address_id].push({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      wattage: row.wattage,
    });
  }

  return addressResult.rows.map((row) => ({
    id: row.id,
    label: row.label,
    fullAddress: row.full_address,
    city: row.city,
    province: row.province,
    zipCode: row.zip_code,
    lat: row.lat,
    lng: row.lng,
    isDefault: row.is_default,
    appliances: applianceMap[row.id] ?? [],
    monthlyBill: Number(row.monthly_bill),
  }));
}

export async function addressBelongsToUser(
  addressId: string,
  userId: string
): Promise<boolean> {
  const result = await dbQuery<{ n: number }>(
    `SELECT 1 AS n FROM saved_addresses WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [addressId, userId]
  );
  return result.rows.length > 0;
}

export async function addSavedAddressToDb(
  data: {
    label: string;
    fullAddress: string;
    city: string;
    province: string;
    zipCode: string;
    lat: number;
    lng: number;
    isDefault: boolean;
    monthlyBill: number;
    appliances: Array<{ name: string; quantity: number; wattage: number }>;
  },
  userId: string
): Promise<SavedAddress> {
  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM saved_addresses"
  );
  const nextId = `addr-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;

  if (data.isDefault) {
    await dbQuery(
      "UPDATE saved_addresses SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE",
      [userId]
    );
  }

  const addressResult = await dbQuery<AddressRow>(
    `INSERT INTO saved_addresses
      (id, label, full_address, city, province, zip_code, lat, lng, is_default, monthly_bill, user_id)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, label, full_address, city, province, zip_code, lat, lng, is_default, monthly_bill`,
    [
      nextId,
      data.label,
      data.fullAddress,
      data.city,
      data.province,
      data.zipCode,
      data.lat,
      data.lng,
      data.isDefault,
      data.monthlyBill,
      userId,
    ]
  );

  for (let i = 0; i < data.appliances.length; i += 1) {
    const item = data.appliances[i];
    const appId = `${nextId}-app-${String(i + 1).padStart(2, "0")}`;
    await dbQuery(
      `INSERT INTO appliances (id, address_id, name, quantity, wattage)
       VALUES ($1, $2, $3, $4, $5)`,
      [appId, nextId, item.name, item.quantity, item.wattage]
    );
  }

  const applianceResult = await dbQuery<ApplianceRow>(
    `SELECT id, address_id, name, quantity, wattage
     FROM appliances
     WHERE address_id = $1
     ORDER BY id ASC`,
    [nextId]
  );

  const row = addressResult.rows[0];
  return {
    id: row.id,
    label: row.label,
    fullAddress: row.full_address,
    city: row.city,
    province: row.province,
    zipCode: row.zip_code,
    lat: row.lat,
    lng: row.lng,
    isDefault: row.is_default,
    monthlyBill: Number(row.monthly_bill),
    appliances: applianceResult.rows.map((app) => ({
      id: app.id,
      name: app.name,
      quantity: app.quantity,
      wattage: app.wattage,
    })),
  };
}

export async function setDefaultSavedAddressInDb(
  id: string,
  userId: string
): Promise<boolean> {
  await dbQuery(
    "UPDATE saved_addresses SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE",
    [userId]
  );
  const result = await dbQuery<{ id: string }>(
    "UPDATE saved_addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteSavedAddressInDb(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await dbQuery<{ id: string }>(
    "DELETE FROM saved_addresses WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listClientContactsFromDb(): Promise<
  { id: string; name: string; company: string; userId?: string }[]
> {
  const result = await dbQuery<{
    id: string;
    name: string;
    company: string | null;
    user_id: string | null;
  }>(
    `SELECT c.id, c.name, c.company, u.id AS user_id
     FROM clients c
     LEFT JOIN users u
       ON LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
     ORDER BY c.name ASC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company ?? row.name,
    userId: row.user_id ?? undefined,
  }));
}

export async function listClientsWithAddressesFromDb(): Promise<
  { id: string; company: string; defaultAddress: string }[]
> {
  const result = await dbQuery<{
    id: string;
    name: string;
    company: string | null;
  }>("SELECT id, name, company FROM clients ORDER BY name ASC");
  return result.rows.map((row) => ({
    id: row.id,
    company: row.company ?? row.name,
    defaultAddress: "",
  }));
}

type SupportTicketRow = {
  id: string;
  project_id: string | null;
  project_name: string | null;
  client_name: string;
  client_email: string;
  subject: string;
  description: string;
  status: SupportTicket["status"];
  created_at: string | Date;
};

const TICKET_PAGE_SIZE = 50;

export async function listSupportTicketsFromDb(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ items: SupportTicket[]; total: number; hasMore: boolean }> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? TICKET_PAGE_SIZE));
  const offset = Math.max(0, opts?.offset ?? 0);

  const [countResult, result] = await Promise.all([
    dbQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM support_tickets"),
    dbQuery<SupportTicketRow>(
      `SELECT t.id, t.project_id, t.client_name, t.client_email, t.subject, t.description, t.status, t.created_at,
              p.name AS project_name
       FROM support_tickets t
       LEFT JOIN projects p ON t.project_id = p.id
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit + 1, offset]
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  const rows = result.rows.slice(0, limit);
  const hasMore = result.rows.length > limit;

  const items = rows.map((row) => ({
    id: row.id,
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    clientName: row.client_name,
    clientEmail: row.client_email,
    subject: row.subject,
    description: row.description,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }));

  return { items, total, hasMore };
}

export async function createSupportTicketInDb(data: {
  projectId?: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  description: string;
}): Promise<SupportTicket> {
  const countResult = await dbQuery<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM support_tickets"
  );
  const nextId = `tkt-${String(Number(countResult.rows[0]?.count ?? "0") + 1).padStart(3, "0")}`;

  await dbQuery(
    `INSERT INTO support_tickets (id, project_id, client_name, client_email, subject, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
    [
      nextId,
      data.projectId ?? null,
      data.clientName.trim(),
      data.clientEmail.trim(),
      data.subject.trim(),
      data.description.trim(),
    ]
  );

  const result = await dbQuery<SupportTicketRow>(
    `SELECT t.id, t.project_id, t.client_name, t.client_email, t.subject, t.description, t.status, t.created_at,
            p.name AS project_name
     FROM support_tickets t
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1 LIMIT 1`,
    [nextId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Ticket was created but could not be read back.");
  return mapSupportTicketRow(row);
}

function mapSupportTicketRow(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    projectName: row.project_name ?? undefined,
    clientName: row.client_name,
    clientEmail: row.client_email,
    subject: row.subject,
    description: row.description,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function deleteSupportTicketFromDb(id: string): Promise<boolean> {
  const result = await dbQuery("DELETE FROM support_tickets WHERE id = $1 RETURNING id", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateSupportTicketInDb(
  id: string,
  data: { status?: SupportTicket["status"] }
): Promise<SupportTicket | null> {
  if (!data.status) return null;
  await dbQuery(
    `UPDATE support_tickets SET status = $2 WHERE id = $1`,
    [id, data.status]
  );
  const fetchResult = await dbQuery<SupportTicketRow>(
    `SELECT t.id, t.project_id, t.client_name, t.client_email, t.subject, t.description, t.status, t.created_at,
            p.name AS project_name
     FROM support_tickets t
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1 LIMIT 1`,
    [id]
  );
  const row = fetchResult.rows[0];
  if (!row) return null;
  return mapSupportTicketRow(row);
}

export async function listSupportTicketsByEmail(clientEmail: string): Promise<SupportTicket[]> {
  const result = await dbQuery<SupportTicketRow>(
    `SELECT t.id, t.project_id, t.client_name, t.client_email, t.subject, t.description, t.status, t.created_at,
            p.name AS project_name
     FROM support_tickets t
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE LOWER(TRIM(t.client_email)) = LOWER(TRIM($1))
     ORDER BY t.created_at DESC`,
    [clientEmail]
  );
  return result.rows.map(mapSupportTicketRow);
}
