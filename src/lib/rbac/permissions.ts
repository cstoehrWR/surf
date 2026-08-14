import { Role } from "@prisma/client";

export type Permission =
  | "settings.manage"
  | "products.write"
  | "products.read"
  | "bookings.write"
  | "bookings.read"
  | "bookings.override"
  | "payments.read"
  | "payments.write"
  | "checkin.perform"
  | "sessions.write"
  | "sessions.read"
  | "sessions.own"
  | "customers.write"
  | "customers.read"
  | "staff.write"
  | "resources.write"
  | "resources.read"
  | "reports.read"
  | "attendance.mark";

const matrix: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "settings.manage",
    "products.write",
    "products.read",
    "bookings.write",
    "bookings.read",
    "bookings.override",
    "payments.read",
    "payments.write",
    "checkin.perform",
    "sessions.write",
    "sessions.read",
    "customers.write",
    "customers.read",
    "staff.write",
    "resources.write",
    "resources.read",
    "reports.read",
    "attendance.mark",
  ],
  ADMIN: [
    "products.write",
    "products.read",
    "bookings.write",
    "bookings.read",
    "bookings.override",
    "payments.read",
    "payments.write",
    "checkin.perform",
    "sessions.write",
    "sessions.read",
    "customers.write",
    "customers.read",
    "staff.write",
    "resources.write",
    "resources.read",
    "reports.read",
    "attendance.mark",
  ],
  OFFICE: [
    "products.read",
    "bookings.write",
    "bookings.read",
    "payments.read",
    "checkin.perform",
    "sessions.write",
    "sessions.read",
    "customers.write",
    "customers.read",
    "resources.read",
    "attendance.mark",
  ],
  INSTRUCTOR: ["sessions.own", "sessions.read", "attendance.mark"],
  CUSTOMER: ["bookings.read"],
};

export function hasPermission(role: Role, permission: Permission) {
  return matrix[role]?.includes(permission) ?? false;
}

export function assertPermission(role: Role, permission: Permission) {
  if (!hasPermission(role, permission)) {
    const error = new Error("FORBIDDEN");
    error.name = "ForbiddenError";
    throw error;
  }
}

export { matrix as rolePermissionMatrix };
