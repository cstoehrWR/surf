import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { handleError, jsonError, requireTenant } from "@/lib/api/guard";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireTenant("settings.manage");
    const orgId = organizationId ?? user.organizationId;
    if (!orgId) return jsonError("Organization required");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("file required");
    if (!ALLOWED.has(file.type)) return jsonError("Only jpeg/png/webp/gif allowed");
    if (file.size > MAX_BYTES) return jsonError("File too large (max 4MB)");

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", orgId);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buffer);
    const url = `/uploads/${orgId}/${name}`;
    return NextResponse.json({ data: { url } }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
