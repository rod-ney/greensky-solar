import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { getAuthUserByEmailFromDb } from "@/lib/server/general-repository";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { dbQuery } from "@/lib/server/db";
import { changePasswordSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const result = await validateBody(request, changePasswordSchema);
  if (!result.success) return result.response;
  const { currentPassword, newPassword } = result.data;

  try {

    const user = await getAuthUserByEmailFromDb(auth.email);
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const valid = verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    const passwordHash = hashPassword(newPassword);
    await dbQuery(
      `UPDATE users SET password_hash = $2 WHERE id = $1`,
      [auth.userId, passwordHash]
    );

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
