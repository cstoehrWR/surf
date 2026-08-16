import { z } from "zod";

export const availabilityQuerySchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  participants: z.coerce.number().int().min(1).max(40).default(1),
});

export const participantSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: z.string().optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  heightCm: z.coerce.number().int().min(50).max(250).optional(),
  weightKg: z.coerce.number().min(10).max(250).optional(),
  surfLevel: z.enum(["NONE", "BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]).optional(),
  wetsuitSize: z.string().max(20).optional(),
  shoeSize: z.string().max(10).optional(),
  canSwim: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const createBookingSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  participants: z.array(participantSchema).min(1),
  addOnProductIds: z.array(z.string()).optional(),
  customer: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email(),
    phone: z.string().max(40).optional(),
  }),
  consents: z.object({
    agb: z.literal(true),
    privacy: z.literal(true),
    participation: z.literal(true),
  }),
  source: z.string().optional(),
  overrideReason: z.string().max(500).optional(),
  locale: z.enum(["de", "en"]).optional(),
  discountCode: z.string().min(2).max(40).optional(),
});

export const patchBookingSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const createSessionSchema = z.object({
  productId: z.string(),
  locationId: z.string(),
  startsAt: z.string(),
  maxParticipants: z.coerce.number().int().min(1).optional(),
  instructorIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const patchSessionSchema = z.object({
  startsAt: z.string().optional(),
  status: z.enum(["PLANNED", "CONFIRMED", "WEATHER_CHECK", "POSTPONED", "CANCELLED", "COMPLETED"]).optional(),
  instructorIds: z.array(z.string()).optional(),
  maxParticipants: z.coerce.number().int().min(1).optional(),
  notes: z.string().optional(),
  notify: z.boolean().optional(),
});

export const createPaymentSchema = z.object({
  bookingId: z.string(),
  method: z.enum(["STRIPE", "CASH", "MANUAL", "PAYMENT_LINK"]).default("STRIPE"),
  amount: z.coerce.number().positive().optional(),
});
