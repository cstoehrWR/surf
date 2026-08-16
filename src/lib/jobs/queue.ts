import { Queue } from "bullmq";
import { logger } from "@/lib/logger";

export function getAutomationQueue() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Queue("surf-automations", { connection: { url } });
}

export async function enqueueAutomation(name: string, payload: Record<string, unknown>) {
  const queue = getAutomationQueue();
  if (!queue) {
    logger.info("jobs.skipped_no_redis", { name });
    return;
  }
  await queue.add(name, payload);
}
