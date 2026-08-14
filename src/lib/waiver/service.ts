import { prisma } from "@/lib/db";
import { BookingError } from "@/lib/booking/service";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { sendTemplatedEmail } from "@/lib/notifications/provider";

export function ageFromDob(dateOfBirth: Date | null | undefined, on = new Date()) {
  if (!dateOfBirth) return null;
  let age = on.getFullYear() - dateOfBirth.getFullYear();
  const m = on.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

export function isMinor(age: number | null | undefined) {
  return age != null && age < 18;
}

export function requiresGuardian(age: number | null | undefined) {
  return isMinor(age);
}

export async function resolveWaiverTemplate(params: {
  organizationId: string;
  productId: string;
  locationId?: string | null;
  age?: number | null;
}) {
  const templates = await prisma.waiverTemplate.findMany({
    where: {
      organizationId: params.organizationId,
      active: true,
      products: { some: { productId: params.productId } },
    },
    orderBy: { version: "desc" },
  });

  const age = params.age ?? null;
  const match =
    templates.find((t) => {
      if (params.locationId && t.locationId && t.locationId !== params.locationId) return false;
      if (t.minAge != null && age != null && age < t.minAge) return false;
      return true;
    }) ?? templates[0];

  return match ?? null;
}

export async function getRequiredWaivers(token: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { accessToken: token },
    include: {
      items: { include: { product: true, session: true } },
      participants: { include: { waivers: true } },
    },
  });
  const productId = booking.items.find((i) => i.product)?.productId;
  if (!productId) return [];

  const results = [];
  for (const participant of booking.participants) {
    const age = participant.age ?? ageFromDob(participant.dateOfBirth);
    const template = await resolveWaiverTemplate({
      organizationId: booking.organizationId,
      productId,
      locationId: booking.locationId,
      age,
    });
    if (!template) continue;
    const existing = participant.waivers.find(
      (w) => w.templateId === template.id && w.templateVersion === template.version && w.accepted,
    );
    results.push({
      participantId: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      age,
      requiresGuardian: requiresGuardian(age),
      signed: Boolean(existing),
      signatureId: existing?.id ?? null,
      template: {
        id: template.id,
        name: template.name,
        version: template.version,
        body: template.body,
      },
    });
  }
  return results;
}

export async function signWaiver(params: {
  token: string;
  participantId: string;
  templateId: string;
  signerName: string;
  guardian: boolean;
  accepted: boolean;
  signatureData: string;
  ip?: string;
}) {
  if (!params.accepted) {
    throw new BookingError("Consent required", "WAIVER_NOT_ACCEPTED");
  }
  if (!params.signerName.trim() || !params.signatureData.trim()) {
    throw new BookingError("Signature required", "WAIVER_SIGNATURE_REQUIRED");
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { accessToken: params.token },
    include: {
      customer: true,
      items: { include: { product: true } },
      participants: true,
    },
  });
  const participant = booking.participants.find((p) => p.id === params.participantId);
  if (!participant) throw new BookingError("Participant not found", "NOT_FOUND");

  const template = await prisma.waiverTemplate.findFirst({
    where: { id: params.templateId, organizationId: booking.organizationId, active: true },
  });
  if (!template) throw new BookingError("Template not found", "TEMPLATE_NOT_FOUND");

  const age = participant.age ?? ageFromDob(participant.dateOfBirth);
  if (requiresGuardian(age) && !params.guardian) {
    throw new BookingError("Guardian signature required", "GUARDIAN_REQUIRED");
  }

  const existing = await prisma.waiverSignature.findFirst({
    where: {
      participantId: participant.id,
      templateId: template.id,
      templateVersion: template.version,
      accepted: true,
    },
  });
  if (existing) {
    throw new BookingError("Already signed – immutable", "WAIVER_IMMUTABLE");
  }

  const signature = await prisma.waiverSignature.create({
    data: {
      bookingId: booking.id,
      participantId: participant.id,
      templateId: template.id,
      templateVersion: template.version,
      signerName: params.signerName.trim(),
      guardian: params.guardian || requiresGuardian(age),
      accepted: true,
      signatureData: params.signatureData,
      ip: params.ip,
    },
  });

  await dispatchWebhook({
    organizationId: booking.organizationId,
    event: "waiver.signed",
    payload: {
      bookingId: booking.id,
      participantId: participant.id,
      templateId: template.id,
      version: template.version,
    },
  });

  return signature;
}

export async function notifyMissingWaivers(token: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { accessToken: token },
    include: { customer: true },
  });
  const required = await getRequiredWaivers(token);
  const missing = required.filter((r) => !r.signed);
  if (!missing.length) return { sent: false, missing: 0 };
  await sendTemplatedEmail({
    organizationId: booking.organizationId,
    to: booking.customer.email,
    templateKey: "waiver.missing",
    locale: booking.locale,
    variables: {
      "customer.firstName": booking.customer.firstName,
      "booking.number": booking.number,
      "session.date": "",
      "session.time": "",
      "location.name": "",
    },
  });
  return { sent: true, missing: missing.length };
}
