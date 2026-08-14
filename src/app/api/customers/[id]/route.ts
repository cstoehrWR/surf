import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("customers.read");
    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { bookings: { include: { items: true, participants: true } } },
    });
    if (!customer) return jsonError("Not found", 404);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleError(error);
  }
}
