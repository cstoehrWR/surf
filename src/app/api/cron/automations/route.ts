import { NextRequest, NextResponse } from "next/server";
import { runAutomations } from "@/lib/automations/runner";
import { handleError, jsonError } from "@/lib/api/guard";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const urlSecret = new URL(request.url).searchParams.get("secret");
  return urlSecret === secret;
}

/** Scheduled runner for automation rules. Protect with CRON_SECRET. */
export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) return jsonError("Unauthorized", 401);
    const body = await request.json().catch(() => ({}));
    const results = await runAutomations(body.organizationId);
    return NextResponse.json({ data: results, ranAt: new Date().toISOString() });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
