import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type NotificationPayload = {
  to: string;
  templateKey: string;
  locale?: string;
  subject: string;
  body: string;
  variables: Record<string, string>;
};

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}

function applyVars(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => variables[key.trim()] ?? "");
}

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload) {
    logger.info("notification.console", {
      to: payload.to,
      templateKey: payload.templateKey,
      subject: payload.subject,
      body: payload.body,
    });
  }
}

export class ResendNotificationProvider implements NotificationProvider {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}
  async send(payload: NotificationPayload) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: `<div style="font-family:sans-serif;line-height:1.5">${payload.body
          .split("\n")
          .map((line) => `<p>${line}</p>`)
          .join("")}</div>`,
        text: payload.body,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend failed: ${res.status}`);
    }
  }
}

export function getNotificationProvider(): NotificationProvider {
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) {
    return new ResendNotificationProvider(
      process.env.RESEND_API_KEY,
      process.env.EMAIL_FROM ?? "noreply@example.com",
    );
  }
  return new ConsoleNotificationProvider();
}

export async function sendTemplatedEmail(params: {
  organizationId: string;
  to: string;
  templateKey: string;
  locale?: string;
  variables: Record<string, string>;
}) {
  const locale = params.locale ?? "de";
  const template = await prisma.emailTemplate.findUnique({
    where: {
      organizationId_key_locale: {
        organizationId: params.organizationId,
        key: params.templateKey,
        locale,
      },
    },
  });
  const subject = template
    ? applyVars(template.subject, params.variables)
    : params.templateKey;
  const body = template
    ? applyVars(template.body, params.variables)
    : Object.entries(params.variables)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

  const provider = getNotificationProvider();
  await provider.send({
    to: params.to,
    templateKey: params.templateKey,
    locale,
    subject,
    body,
    variables: params.variables,
  });
  await prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      channel: "email",
      to: params.to,
      templateKey: params.templateKey,
      payload: { subject, body, variables: params.variables },
      status: "sent",
      sentAt: new Date(),
    },
  });
  return { subject, body };
}
