import { NextRequest, NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/validation/schemas";
import { getAvailability } from "@/lib/availability/service";
import { jsonError, rateLimit } from "@/lib/api/guard";

export async function GET(request: NextRequest) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "availability", 90)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    productId: url.searchParams.get("productId"),
    locationId: url.searchParams.get("locationId"),
    date: url.searchParams.get("date"),
    participants: url.searchParams.get("participants") ?? 1,
  });
  if (!parsed.success) return jsonError("Invalid query", 400, parsed.error.flatten());

  const date = new Date(`${parsed.data.date}T12:00:00`);
  const result = await getAvailability({
    productId: parsed.data.productId,
    locationId: parsed.data.locationId,
    date,
    participants: parsed.data.participants,
  });
  return NextResponse.json({
    data: {
      productId: result.productId,
      locationId: result.locationId,
      date: result.date,
      participants: result.participants,
      slots: result.slots.map((slot) => ({
        startTime: slot.startTime,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        sessionId: slot.sessionId,
        available: slot.available,
        availableSlots: slot.availableSlots,
        price: slot.price,
        currency: slot.currency,
        missingResources: slot.missingResources,
        reasons: slot.reasons,
        warnings: slot.warnings,
      })),
    },
  });
}
