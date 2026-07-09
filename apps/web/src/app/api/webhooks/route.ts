import { createVerify } from "node:crypto";
import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import type { EngagementType, RecipientStatus } from "@repo/shared-types";

// ─── Signature verification ───────────────────────────────────────────────────

// SendGrid signs webhook payloads with ECDSA P-256 / SHA-256.
// The public key (PEM) lives in Settings → Mail Settings → Event Webhooks.
// If the env var is absent we skip verification (dev / non-SendGrid SMTP).
function verifySignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string,
): boolean {
  try {
    const verify = createVerify("SHA256");
    verify.update(timestamp + body);
    return verify.verify(publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

// ─── Event shape (SendGrid payload) ─────────────────────────────────────────

interface SendGridEvent {
  event: string;
  email: string;
  timestamp?: number;
  [key: string]: unknown;
}

// ─── Terminal statuses — never downgrade a recipient out of these ─────────────

const TERMINAL: RecipientStatus[] = ["bounced", "spam", "unsubscribed"];

// ─── Per-event handler ────────────────────────────────────────────────────────

type EventConfig = {
  status: RecipientStatus;
  engagementType: EngagementType;
  campaignField: "bounceCount" | "spamCount" | "unsubscribeCount";
};

const EVENT_MAP: Record<string, EventConfig> = {
  bounce: {
    status: "bounced",
    engagementType: "bounce",
    campaignField: "bounceCount",
  },
  spamreport: {
    status: "spam",
    engagementType: "spam",
    campaignField: "spamCount",
  },
  unsubscribe: {
    status: "unsubscribed",
    engagementType: "unsubscribe",
    campaignField: "unsubscribeCount",
  },
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  // Read body as text first — signature verification needs the raw bytes
  const body = await request.text();

  // Verify SendGrid signature when the signing key is configured.
  // Fail-closed: if the key is set but the signature is missing or wrong, reject.
  const signingKey = process.env.SENDGRID_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const signature = request.headers.get(
      "x-twilio-email-event-webhook-signature",
    );
    const timestamp = request.headers.get(
      "x-twilio-email-event-webhook-timestamp",
    );
    if (
      !signature ||
      !timestamp ||
      !verifySignature(body, signature, timestamp, signingKey)
    ) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // tenantId is resolved from hostname by middleware — present even for public routes
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) return new Response("Bad Request", { status: 400 });

  let events: SendGridEvent[];
  try {
    const parsed = JSON.parse(body);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Process events synchronously — simple enough at current scale.
  // Return 200 regardless of per-event errors so SendGrid doesn't retry the batch.
  const prisma = await getPrisma();

  for (const event of events) {
    const config = EVENT_MAP[event.event];
    if (!config || typeof event.email !== "string" || !event.email) continue;

    try {
      // Find all recipients with this email for this tenant that haven't
      // already reached a terminal state (avoid downgrading bounced → spam etc.)
      const recipients = await prisma.recipient.findMany({
        where: {
          email: event.email.toLowerCase(),
          tenantId,
          status: { notIn: TERMINAL },
        },
        select: { id: true, campaignId: true },
      });

      if (recipients.length === 0) continue;

      const ids = recipients.map((r) => r.id);

      await Promise.all([
        // Update all matching recipients to the new terminal status
        prisma.recipient.updateMany({
          where: { id: { in: ids } },
          data: { status: config.status },
        }),

        // Increment the relevant counter on each affected campaign
        ...recipients.map((r) =>
          prisma.campaign.update({
            where: { id: r.campaignId },
            data: { [config.campaignField]: { increment: 1 } },
          }),
        ),

        // Record engagement events for analytics
        prisma.engagement.createMany({
          data: recipients.map((r) => ({
            tenantId,
            campaignId: r.campaignId,
            recipientId: r.id,
            type: config.engagementType,
          })),
          skipDuplicates: true,
        }),
      ]);
    } catch (err) {
      // Log but don't abort — remaining events in the batch must still be processed
      console.error(
        JSON.stringify({
          event: "webhook_event_error",
          type: event.event,
          email: event.email,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  return new Response("OK", { status: 200 });
}
