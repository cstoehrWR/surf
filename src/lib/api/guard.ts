import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac/permissions";
import { Role } from "@prisma/client";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role as Role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (error.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (error.name === "BookingError") {
      return NextResponse.json(
        { error: error.message, code: (error as { code?: string }).code, details: (error as { details?: unknown }).details },
        { status: 409 },
      );
    }
  }
  return jsonError("Internal error", 500);
}
