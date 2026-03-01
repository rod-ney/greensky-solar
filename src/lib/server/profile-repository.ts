import { dbQuery } from "@/lib/server/db";
import { toIsoDateManila } from "@/lib/date-utils";
import type { User } from "@/types";

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  contact_number: string | null;
  role: User["role"];
  avatar: string;
  avatar_url: string | null;
  status: User["status"];
  two_factor_enabled: boolean;
  last_login: string | Date | null;
  created_at: string | Date;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  contactNumber?: string | null;
  role: User["role"];
  avatar: string;
  avatarUrl?: string | null;
  status: User["status"];
  twoFactorEnabled: boolean;
  lastLogin?: string | null;
  createdAt: string;
};

export type LoginActivityRow = {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | Date;
};

export type LoginActivity = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    contactNumber: row.contact_number ?? undefined,
    role: row.role,
    avatar: row.avatar,
    avatarUrl: row.avatar_url ?? undefined,
    status: row.status,
    twoFactorEnabled: row.two_factor_enabled ?? false,
    lastLogin: row.last_login ? new Date(row.last_login).toISOString() : null,
    createdAt: toIsoDateManila(row.created_at),
  };
}

export async function getProfileFromDb(userId: string): Promise<Profile | null> {
  const result = await dbQuery<ProfileRow>(
    `SELECT id, name, email, contact_number, role, avatar, avatar_url, status,
            COALESCE(two_factor_enabled, false) AS two_factor_enabled,
            last_login, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return rowToProfile(row);
}

function isValidContactNumber(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export async function updateProfileInDb(data: {
  userId: string;
  name?: string;
  contactNumber?: string | null;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}): Promise<Profile | null> {
  if (
    data.contactNumber !== undefined &&
    data.contactNumber !== null &&
    !isValidContactNumber(data.contactNumber)
  ) {
    throw new Error("Contact number must be exactly 10 digits.");
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${idx++}`);
    params.push(data.name);
  }
  if (data.contactNumber !== undefined) {
    updates.push(`contact_number = $${idx++}`);
    params.push(data.contactNumber);
  }
  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${idx++}`);
    params.push(data.avatarUrl);
  }
  if (data.twoFactorEnabled !== undefined) {
    updates.push(`two_factor_enabled = $${idx++}`);
    params.push(data.twoFactorEnabled);
  }

  if (updates.length === 0) return getProfileFromDb(data.userId);

  params.push(data.userId);
  const result = await dbQuery<ProfileRow>(
    `UPDATE users SET ${updates.join(", ")}
     WHERE id = $${idx}
     RETURNING id, name, email, contact_number, role, avatar, avatar_url, status,
               COALESCE(two_factor_enabled, false) AS two_factor_enabled,
               last_login, created_at`,
    params
  );
  const row = result.rows[0];
  if (!row) return null;
  return rowToProfile(row);
}

export async function recordLoginActivityInDb(data: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const id = `la-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await dbQuery(
    `INSERT INTO login_activity (id, user_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [id, data.userId, data.ipAddress ?? null, data.userAgent ?? null]
  );
}

export async function listLoginActivityFromDb(
  userId: string,
  limit = 20
): Promise<LoginActivity[]> {
  const result = await dbQuery<LoginActivityRow>(
    `SELECT id, user_id, ip_address, user_agent, created_at
     FROM login_activity
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map((row) => {
    const d = typeof row.created_at === "string" ? new Date(row.created_at) : row.created_at;
    const createdAt = d.toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    });
    return {
      id: row.id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt,
    };
  });
}
