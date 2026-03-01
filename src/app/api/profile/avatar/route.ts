import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { updateProfileInDb } from "@/lib/server/profile-repository";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let base64Data: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No file provided." },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 2MB." },
          { status: 400 }
        );
      }
      const buffer = await file.arrayBuffer();
      const b64 = Buffer.from(buffer).toString("base64");
      base64Data = `data:${file.type};base64,${b64}`;
    } else if (contentType.includes("application/json")) {
      const body = (await request.json()) as { avatarUrl?: string | null };
      if (body.avatarUrl === null || body.avatarUrl === "") {
        const updated = await updateProfileInDb({
          userId: auth.userId,
          avatarUrl: null,
        });
        if (!updated) {
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        return NextResponse.json(updated);
      }
      if (typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("data:image")) {
        const sizeEstimate = (body.avatarUrl.length * 3) / 4;
        if (sizeEstimate > MAX_SIZE) {
          return NextResponse.json(
            { error: "Image too large. Maximum size is 2MB." },
            { status: 400 }
          );
        }
        base64Data = body.avatarUrl;
      }
    }

    if (!base64Data) {
      return NextResponse.json(
        { error: "Provide a file (multipart) or avatarUrl (JSON)." },
        { status: 400 }
      );
    }

    const updated = await updateProfileInDb({
      userId: auth.userId,
      avatarUrl: base64Data,
    });
    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
