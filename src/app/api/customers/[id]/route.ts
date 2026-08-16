import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";
import { orgWhere } from "@/lib/tenant/org";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await requireTenant("customers.read");
    const { id } = await context.params;
    const customer = await prisma.customer.findFirst({
      where: { id, ...orgWhere(organizationId) },
      include: {
        consents: { orderBy: { createdAt: "desc" } },
        bookings: {
          include: {
            items: { include: { product: true, session: true } },
            participants: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: { select: { bookings: true, waitlist: true } },
      },
    });
    if (!customer) return jsonError("Not found", 404);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleError(error);
  }
}
