import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updatePortalParticipant } from "@/lib/portal/service";
import { handleError, jsonError, rateLimit } from "@/lib/api/guard";

const schema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  dateOfBirth: z.string().optional().nullable(),
  age: z.coerce.number().int().min(0).max(120).optional().nullable(),
  heightCm: z.coerce.number().int().min(50).max(250).optional().nullable(),
  weightKg: z.coerce.number().min(10).max(250).optional().nullable(),
  surfLevel: z.enum(["NONE", "BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]).optional(),
  wetsuitSize: z.string().max(20).optional().nullable(),
  shoeSize: z.string().max(10).optional().nullable(),
  canSwim: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ token: string; participantId: string }> }) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "portal", 40)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const { token, participantId } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const participant = await updatePortalParticipant({
      token,
      participantId,
      data: parsed.data,
    });
    return NextResponse.json({ data: participant });
  } catch (error) {
    return handleError(error);
  }
}
