import { dbQuery } from "@/lib/server/db";

export async function logProfileChangeInDb(data: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}): Promise<void> {
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await dbQuery(
    `INSERT INTO audit_log (id, user_id, action, resource, resource_id, old_value, new_value, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      data.userId,
      data.action,
      data.resource,
      data.resourceId ?? null,
      data.oldValue ? JSON.stringify(data.oldValue) : null,
      data.newValue ? JSON.stringify(data.newValue) : null,
      data.ipAddress ?? null,
    ]
  );
}
