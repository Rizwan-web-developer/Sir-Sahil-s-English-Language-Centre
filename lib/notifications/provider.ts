export type NotificationPayload = {
  to: string;
  title: string;
  body: string;
  channel: "in_app" | "whatsapp" | "sms";
  meta?: Record<string, unknown>;
};

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ ok: true } | { ok: false; error: string }>;
}

export class StubNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload) {
    console.info("[notification:stub]", payload.channel, payload.to, payload.title);
    return { ok: true as const };
  }
}

export function getNotificationProvider(): NotificationProvider {
  // Replace with WhatsApp Cloud API / SMS gateway integration later.
  return new StubNotificationProvider();
}
