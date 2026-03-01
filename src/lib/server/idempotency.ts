import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/server/db";

const TTL_HOURS = 24;

function getExpiresAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + TTL_HOURS);
  return d.toISOString();
}

export function getIdempotencyKey(request: Request): string | null {
  const key = request.headers.get("Idempotency-Key")?.trim();
  if (!key) return null;
  if (key.length > 128) return null;
  return key;
}

type IdempotencyRow = {
  key: string;
  status: "in_progress" | "completed" | "failed";
  http_status: number;
  response_body: unknown;
};

async function storeResponse(
  key: string,
  status: "completed" | "failed",
  httpStatus: number,
  responseBody: unknown
): Promise<void> {
  await dbQuery(
    `UPDATE idempotency_keys
     SET status = $2, http_status = $3, response_body = $4
     WHERE key = $1`,
    [key, status, httpStatus, JSON.stringify(responseBody)]
  );
}

export async function executeWithIdempotency(
  request: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = getIdempotencyKey(request);
  if (!key) {
    return handler();
  }

  const expiresAt = getExpiresAt();

  const insertResult = await dbQuery(
    `INSERT INTO idempotency_keys (key, status, http_status, response_body, expires_at)
     VALUES ($1, 'in_progress', 0, NULL, $2::timestamptz)
     ON CONFLICT (key) DO NOTHING
     RETURNING key`,
    [key, expiresAt]
  );

  if (insertResult.rowCount === 0) {
    const existing = await dbQuery<IdempotencyRow>(
      `SELECT key, status, http_status, response_body FROM idempotency_keys WHERE key = $1 LIMIT 1`,
      [key]
    );
    const row = existing.rows[0];
    if (!row) {
      throw new Error("Idempotency key conflict");
    }

    if (row.status === "in_progress") {
      return new NextResponse(
        JSON.stringify({ error: "Request in progress. Retry later." }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "5",
          },
        }
      );
    }

    if (row.status === "completed") {
      const body = row.response_body ?? {};
      return NextResponse.json(body, {
        status: row.http_status as 201 | 200,
      });
    }

    if (row.status === "failed") {
      throw new Error("Previous attempt failed");
    }
  }

  try {
    const response = await handler();
    const body = await response.json().catch(() => ({}));
    const status = response.status;

    await storeResponse(key, "completed", status, body);
    return NextResponse.json(body, { status });
  } catch (error) {
    await storeResponse(key, "failed", 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function pruneExpiredKeys(): Promise<number> {
  const result = await dbQuery(
    "DELETE FROM idempotency_keys WHERE expires_at < NOW()"
  );
  return result.rowCount ?? 0;
}
