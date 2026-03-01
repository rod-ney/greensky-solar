import {
  createNotificationInDb,
  type NotificationType,
} from "@/lib/server/notifications-repository";
import { dbQuery } from "@/lib/server/db";

/**
 * Create a notification for a user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message?: string | null,
  link?: string | null,
  metadata?: unknown
): Promise<void> {
  await createNotificationInDb({
    userId,
    type,
    title,
    message: message ?? null,
    link: link ?? null,
    metadata,
  });
}

/**
 * Get admin user IDs for broadcasting admin notifications.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const result = await dbQuery<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
  );
  return result.rows.map((r) => r.id);
}

/**
 * Get user ID for a technician (technicians table has user_id).
 */
export async function getUserIdForTechnician(
  technicianId: string
): Promise<string | null> {
  const result = await dbQuery<{ user_id: string | null }>(
    `SELECT user_id FROM technicians WHERE id = $1`,
    [technicianId]
  );
  return result.rows[0]?.user_id ?? null;
}
