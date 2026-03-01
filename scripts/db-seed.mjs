import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";

const { Client } = pg;

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run seed.");
  }
  return url;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function run() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const seedPath = path.resolve(__dirname, "../db/seed.sql");
  const sql = await fs.readFile(seedPath, "utf8");

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Admin123!";

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Seed complete: db/seed.sql applied.");

    const passwordHash = hashPassword(defaultPassword);
    const seedUserIds = ["user-admin-001", "user-tech-001"];
    for (const userId of seedUserIds) {
      const res = await client.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2 AND (password_hash = '' OR password_hash IS NULL) RETURNING id",
        [passwordHash, userId]
      );
      if (res.rowCount > 0) {
        console.log(`Password set for ${userId} (use: ${defaultPassword})`);
      }
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
