import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendTemplatedEmail } from "@/lib/notifications/provider";
import { getRequiredWaivers } from "@/lib/waiver/service";
import { BookingStatus } from "@prisma/client";

export type AutomationRunResult = {
  ruleId: string;
  name: string;
  processed: number;
  sent: number;
  skipped: number;
};

function hoursFromNow(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000);
}

export async function runAutomations(organizationId?: string): Promise<AutomationRunResult[]> {
  const rules = await prisma.automationRule.findMany({
    where: {
      active: true,
      ...(organizationId ? { organizationId } : {}),
    },
  });

  const results: AutomationRunResult[] = [];
  for (const rule of rules) {
    const result = await runSingleRule(rule.id);
    results.push(result);
  }
  return results;
}

export async function runSingleRule(ruleId: string): Promise<AutomationRunResult> {
  const rule = await prisma.automationRule.findUniqueOrThrow({ where: { id: ruleId } });
  if (!rule.active) {
    return { ruleId: rule.id, name: rule.name, processed: 0, sent: 0, skipped: 0 };
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;

  if (rule.trigger === "session.upcoming") {
    const windowStart = hoursFromNow(rule.offsetHours - 0.5);
    const windowEnd = hoursFromNow(rule.offsetHours + 0.5);
    const sessions = await prisma.courseSession.findMany({
      where: {
        organizationId: rule.organizationId,
        startsAt: { gte: windowStart, lte: windowEnd },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      include: {
        location: true,
        product: true,
        participants: {
          include: {
            booking: { include: { customer: true } },
            participant: { include: { waivers: true } },
          },
        },
      },
    });

    for (const session of sessions) {
      const bookings = new Map<string, (typeof session.participants)[number]["booking"]>();
      for (const sp of session.participants) {
        if (sp.booking.status === BookingStatus.CANCELLED) continue;
        bookings.set(sp.bookingId, sp.booking);
      }

      for (const booking of bookings.values()) {
        processed += 1;
        if (rule.action === "email.reminder") {
          await sendTemplatedEmail({
            organizationId: rule.organizationId,
            to: booking.customer.email,
            templateKey: "session.reminder",
            locale: booking.locale,
            variables: {
              "customer.firstName": booking.customer.firstName,
              "booking.number": booking.number,
              "session.date": session.startsAt.toLocaleDateString("de-DE"),
              "session.time": session.startsAt.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              "location.name": session.location.name,
            },
          });
          sent += 1;
        } else if (rule.action === "email.waiver_missing") {
          const waivers = await getRequiredWaivers(booking.accessToken);
          const missing = waivers.some((w) => !w.signed);
          if (!missing) {
            skipped += 1;
            continue;
          }
          await sendTemplatedEmail({
            organizationId: rule.organizationId,
            to: booking.customer.email,
            templateKey: "waiver.missing",
            locale: booking.locale,
            variables: {
              "customer.firstName": booking.customer.firstName,
              "booking.number": booking.number,
              "session.date": session.startsAt.toLocaleDateString("de-DE"),
              "session.time": session.startsAt.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              "location.name": session.location.name,
            },
          });
          sent += 1;
        } else {
          skipped += 1;
        }
      }
    }
  } else if (rule.trigger === "session.completed") {
    const windowStart = hoursFromNow(rule.offsetHours - 0.5);
    const windowEnd = hoursFromNow(rule.offsetHours + 0.5);
    const sessions = await prisma.courseSession.findMany({
      where: {
        organizationId: rule.organizationId,
        endsAt: { gte: windowStart, lte: windowEnd },
        status: { in: ["COMPLETED", "CONFIRMED"] },
      },
      include: {
        location: true,
        participants: { include: { booking: { include: { customer: true } } } },
      },
    });
    for (const session of sessions) {
      const seen = new Set<string>();
      for (const sp of session.participants) {
        if (seen.has(sp.bookingId)) continue;
        seen.add(sp.bookingId);
        processed += 1;
        if (rule.action === "email.followup") {
          await sendTemplatedEmail({
            organizationId: rule.organizationId,
            to: sp.booking.customer.email,
            templateKey: "session.followup",
            locale: sp.booking.locale,
            variables: {
              "customer.firstName": sp.booking.customer.firstName,
              "booking.number": sp.booking.number,
              "session.date": session.startsAt.toLocaleDateString("de-DE"),
              "session.time": "",
              "location.name": session.location.name,
            },
          });
          sent += 1;
        } else {
          skipped += 1;
        }
      }
    }
  } else {
    logger.warn("automation.unknown_trigger", { ruleId: rule.id, trigger: rule.trigger });
  }

  logger.info("automation.ran", { ruleId: rule.id, processed, sent, skipped });
  return { ruleId: rule.id, name: rule.name, processed, sent, skipped };
}
