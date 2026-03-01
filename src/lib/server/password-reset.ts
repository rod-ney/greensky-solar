import { randomBytes, createHash } from "node:crypto";
import { dbQuery } from "@/lib/server/db";
import { hashPassword } from "@/lib/auth";

const TOKEN_EXPIRY_HOURS = 1;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const id = `prt-${Date.now()}-${randomBytes(4).toString("hex")}`;
  await dbQuery(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, tokenHash, expiresAt.toISOString()]
  );
  return token;
}

export async function consumePasswordResetToken(
  token: string
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);
  const result = await dbQuery<{ id: string; user_id: string }>(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL
     RETURNING id, user_id`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { userId: row.user_id };
}

export async function updatePasswordInDb(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = hashPassword(newPassword);
  await dbQuery(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [userId, passwordHash]
  );
}
