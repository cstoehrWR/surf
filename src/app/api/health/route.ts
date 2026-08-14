import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "north-sea-surf", time: new Date().toISOString() });
}
