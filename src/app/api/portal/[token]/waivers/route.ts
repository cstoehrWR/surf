import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredWaivers, signWaiver } from "@/lib/waiver/service";
import { handleError, jsonError, rateLimit } from "@/lib/api/guard";

export async function GET(_: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const data = await getRequiredWaivers(token);
  return NextResponse.json({ data });
}

const signSchema = z.object({
  participantId: z.string().min(1),
  templateId: z.string().min(1),
  signerName: z.string().min(2).max(120),
  guardian: z.boolean().default(false),
  accepted: z.literal(true),
  signatureData: z.string().min(8).max(20000),
});

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request.headers.get("x-forwarded-for") ?? "waiver", 30)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const { token } = await context.params;
    const parsed = signSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const signature = await signWaiver({
      token,
      ...parsed.data,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json({ data: signature }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
