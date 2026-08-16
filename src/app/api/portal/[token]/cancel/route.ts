import { NextRequest, NextResponse } from "next/server";
import { cancelViaPortal } from "@/lib/portal/service";
import { handleError, rateLimit } from "@/lib/api/guard";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "portal-cancel", 10)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));
    const booking = await cancelViaPortal({ token, reason: body.reason });
    return NextResponse.json({ data: booking });
  } catch (error) {
    return handleError(error);
  }
}
