import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function dispatchWebhook(params: {
  organizationId: string;
  event: string;
  payload: Record<string, unknown>;
}) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId: params.organizationId,
      active: true,
      events: { has: params.event },
    },
  });

  for (const endpoint of endpoints) {
    const body = JSON.stringify({
      event: params.event,
      createdAt: new Date().toISOString(),
      data: params.payload,
    });
    const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
    await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event: params.event,
        payload: JSON.parse(body),
        signature,
        status: "queued",
      },
    });
    logger.info("webhook.queued", { event: params.event, endpoint: endpoint.url });
  }
}
