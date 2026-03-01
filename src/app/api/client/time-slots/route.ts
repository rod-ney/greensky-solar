import { NextResponse } from "next/server";
import { timeSlots } from "@/lib/time-slots";

export async function GET() {
  return NextResponse.json(timeSlots);
}
