import { NextResponse } from "next/server";
import {
  addSavedAddressToDb,
  listSavedAddressesFromDb,
} from "@/lib/server/general-repository";
import { requireClient } from "@/lib/server/auth-guard";
import { createAddressSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const addresses = await listSavedAddressesFromDb(auth.userId);
    return NextResponse.json(addresses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, createAddressSchema);
  if (!result.success) return result.response;
  const body = result.data;
  try {
    const created = await addSavedAddressToDb(
      {
        label: body.label,
        fullAddress: body.fullAddress,
        city: body.city,
        province: body.province,
        zipCode: body.zipCode,
        lat: body.lat,
        lng: body.lng,
        isDefault: body.isDefault === true,
        monthlyBill: body.monthlyBill ?? 0,
        appliances: (body.appliances ?? []).map((item) => ({
          name: String(item.name).trim(),
          quantity: Math.max(1, item.quantity),
          wattage: Math.max(0, item.wattage),
        })),
      },
      auth.userId
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
