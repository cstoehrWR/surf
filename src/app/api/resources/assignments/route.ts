import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assignResource, returnResource, listAssignableResources } from "@/lib/resources/assignment";
import { handleError, jsonError, requirePermission } from "@/lib/api/guard";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("resources.read");
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId");
    if (!locationId) return jsonError("locationId required");
    const resourceTypeId = url.searchParams.get("resourceTypeId") ?? undefined;
    const data = await listAssignableResources({ locationId, resourceTypeId });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

const assignSchema = z.object({
  sessionParticipantId: z.string(),
  resourceId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("checkin.perform");
    const parsed = assignSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const data = await assignResource({ ...parsed.data, actorUserId: user.id });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

const returnSchema = z.object({
  assignmentId: z.string(),
  damageNote: z.string().max(1000).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requirePermission("checkin.perform");
    const parsed = returnSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid payload", 400, parsed.error.flatten());
    const data = await returnResource({ ...parsed.data, actorUserId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
