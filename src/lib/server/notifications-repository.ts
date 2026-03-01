export async function clearAllNotificationsInDb(userId: string): Promise<number> {
  const result = await dbQuery(
    `DELETE FROM notifications WHERE user_id = $1`,
    [userId]
  );
  return result.rowCount ?? 0;
}
import { dbQuery } from "@/lib/server/db";

export type NotificationType =
  | "booking_submitted"
  | "booking_cancelled"
  | "booking_confirmed"
  | "booking_completed"
  | "task_assigned"
  | "task_rescheduled"
  | "task_completed"
  | "report_submitted"
  | "report_approved"
  | "report_rejected"
  | "payment_received"
  | "payment_confirmed"
  | "document_available"
  | "system_alert";

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read_at: string | null;
  metadata: unknown;
  created_at: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  readAt: string | null;
  metadata: unknown;
  createdAt: string;
};

export async function createNotificationInDb(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  link?: string | null;
  metadata?: unknown;
}): Promise<Notification> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await dbQuery(
    `INSERT INTO notifications (id, user_id, type, title, message, link, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      data.userId,
      data.type,
      data.title,
      data.message ?? null,
      data.link ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  const result = await dbQuery<NotificationRow>(
    `SELECT id, user_id, type, title, message, link, read_at, metadata, created_at
     FROM notifications WHERE id = $1`,
    [id]
  );
  const row = result.rows[0]!;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    readAt: row.read_at,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function listNotificationsFromDb(
  userId: string,
  opts?: { limit?: number; offset?: number; type?: NotificationType }
): Promise<Notification[]> {
  const limit = Math.min(opts?.limit ?? 20, 50);
  const offset = opts?.offset ?? 0;
  const typeFilter = opts?.type;

  let query = `SELECT id, user_id, type, title, message, link, read_at, metadata, created_at
               FROM notifications
               WHERE user_id = $1`;
  const params: unknown[] = [userId];
  let idx = 2;
  if (typeFilter) {
    query += ` AND type = $${idx++}`;
    params.push(typeFilter);
  }
  query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(limit, offset);

  const result = await dbQuery<NotificationRow>(query, params);
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    readAt: row.read_at,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

export async function getUnreadCountFromDb(userId: string): Promise<number> {
  const result = await dbQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function markNotificationReadInDb(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await dbQuery(
    `UPDATE notifications SET read_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsReadInDb(
  userId: string
): Promise<number> {
  const result = await dbQuery(
    `UPDATE notifications SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return result.rowCount ?? 0;
}
