import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleError, jsonError, rateLimit, requirePermission } from "@/lib/api/guard";
import {
  joinWaitlist,
  listWaitlist,
  promoteNextWaitlistEntry,
  removeWaitlistEntry,
} from "@/lib/waitlist/service";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("bookings.read");
    const sessionId = new URL(request.url).searchParams.get("sessionId") ?? undefined;
    const orgId = user.organizationId ?? (await prisma.organization.findFirstOrThrow()).id;
    const data = await listWaitlist({ organizationId: orgId, sessionId });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const joinSchema = z.object({
  sessionId: z.string(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  participants: z.coerce.number().int().min(1).max(8).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "promote") {
      await requirePermission("bookings.write");
      const sessionId = z.string().parse(body.sessionId);
      const entry = await promoteNextWaitlistEntry(sessionId);
      return NextResponse.json({ data: entry });
    }
    if (body.action === "remove") {
      await requirePermission("bookings.write");
      const id = z.string().parse(body.id);
      await removeWaitlistEntry(id);
      return NextResponse.json({ data: { ok: true } });
    }

    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`waitlist:${ip}`, 20)) return jsonError("Too many requests", 429);

    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());

    const session = await prisma.courseSession.findUniqueOrThrow({
      where: { id: parsed.data.sessionId },
    });
    const entry = await joinWaitlist({
      organizationId: session.organizationId,
      sessionId: parsed.data.sessionId,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      participants: parsed.data.participants,
    });
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
