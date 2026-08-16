import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  const status = database === "ok" ? 200 : 503;
  return NextResponse.json(
    {
      ok: database === "ok",
      service: "surf",
      database,
      time: new Date().toISOString(),
    },
    { status },
  );
}
