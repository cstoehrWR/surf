import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, requirePermission } from "@/lib/api/guard";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("attendance.mark");
    const { id } = await context.params;
    const { attendance } = await request.json();
    await prisma.sessionParticipant.update({
      where: { id },
      data: { attendance: Boolean(attendance), checkedInAt: attendance ? new Date() : null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
