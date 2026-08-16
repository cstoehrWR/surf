import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleError, jsonError, rateLimit } from "@/lib/api/guard";
import { createLodgingBooking, getLodgingAvailability } from "@/lib/lodging/service";

export async function GET(request: NextRequest) {
  try {
    if (!rateLimit(request.headers.get("x-forwarded-for") ?? "lodging", 60)) {
      return jsonError("Rate limited", 429);
    }
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const checkIn = url.searchParams.get("checkIn");
    const checkOut = url.searchParams.get("checkOut");
    const guests = Number(url.searchParams.get("guests") ?? 2);
    if (!productId || !checkIn || !checkOut) return jsonError("productId, checkIn, checkOut required");
    const data = await getLodgingAvailability({
      productId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const bookSchema = z.object({
  productId: z.string(),
  locationId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.coerce.number().int().min(1).max(12),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
  }),
  guestsDetail: z
    .array(z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }))
    .min(1),
  consents: z.object({
    agb: z.boolean(),
    privacy: z.boolean(),
    participation: z.boolean().optional().default(true),
  }),
});

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(request.headers.get("x-forwarded-for") ?? "lodging-book", 20)) {
      return jsonError("Rate limited", 429);
    }
    const parsed = bookSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const booking = await createLodgingBooking({
      productId: parsed.data.productId,
      locationId: parsed.data.locationId,
      checkIn: new Date(parsed.data.checkIn),
      checkOut: new Date(parsed.data.checkOut),
      guests: parsed.data.guests,
      customer: parsed.data.customer,
      guestsDetail: parsed.data.guestsDetail,
      consents: {
        agb: parsed.data.consents.agb,
        privacy: parsed.data.consents.privacy,
        participation: parsed.data.consents.participation ?? true,
      },
    });
    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
