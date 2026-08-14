import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError, requirePermission } from "@/lib/api/guard";

export async function GET() {
  try {
    await requirePermission("resources.read");
    const resources = await prisma.resource.findMany({
      include: { resourceType: true, location: true },
      orderBy: { inventoryCode: "asc" },
    });
    return NextResponse.json({ data: resources });
  } catch (error) {
    return handleError(error);
  }
}
