import { NextResponse } from "next/server";

/**
 * Server-side reverse geocode proxy for OpenStreetMap Nominatim (usage policy requires a valid User-Agent).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (lat == null || lon == null) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
    String(latNum)
  )}&lon=${encodeURIComponent(String(lonNum))}&format=jsonv2&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GreenskySolar/1.0 (client address book)",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "reverse geocoding failed" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as unknown;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "reverse geocoding unavailable" },
      { status: 502 }
    );
  }
}
