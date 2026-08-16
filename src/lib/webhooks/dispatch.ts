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
    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event: params.event,
        payload: JSON.parse(body),
        signature,
        status: "queued",
      },
    });
    await deliverWebhook(delivery.id, endpoint.url, body, signature);
  }
}

export async function deliverWebhook(
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Surf-Signature": signature,
        "User-Agent": "NorthSeaSurf-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: res.ok ? "delivered" : `failed_${res.status}`,
        attempts: { increment: 1 },
      },
    });
    logger.info("webhook.delivered", { deliveryId, status: res.status, url });
    return res.ok;
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "failed_network",
        attempts: { increment: 1 },
      },
    });
    logger.warn("webhook.failed", {
      deliveryId,
      url,
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export async function processQueuedWebhooks(limit = 20) {
  const queued = await prisma.webhookDelivery.findMany({
    where: { status: { in: ["queued", "failed_network"] }, attempts: { lt: 5 } },
    include: { endpoint: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let delivered = 0;
  for (const item of queued) {
    const body = JSON.stringify(item.payload);
    const ok = await deliverWebhook(item.id, item.endpoint.url, body, item.signature);
    if (ok) delivered += 1;
  }
  return { processed: queued.length, delivered };
}

export function createWebhookSecret() {
  return createHmac("sha256", String(Date.now())).update(Math.random().toString()).digest("hex").slice(0, 32);
}
