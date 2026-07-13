import http from "node:http";
import { PgBoss } from "pg-boss";
import type { JobWithMetadata } from "pg-boss";
import type { EmailJob } from "@repo/shared-types";
import { createTransporterForTenant } from "./mailer.js";
import { getScopedPrisma } from "./db.js";
import { injectTrackingPixel, wrapTrackingLinks } from "./tracking.js";

// Single shared queue for all tenants — pg-boss v12 does not support wildcards in work().
// tenantId is carried in job.data and used to scope all DB and SMTP operations.
const QUEUE_NAME = "send-email";
const PORT = Number(process.env.PORT ?? 3001);

async function processEmail(job: JobWithMetadata<EmailJob>): Promise<void> {
  const { tenantId, recipientId, campaignId, templateId } = job.data;
  // retryCount is 0-indexed; retryLimit is the ceiling — equal means no retries left
  const isLastAttempt = job.retryCount >= job.retryLimit;
  const prisma = getScopedPrisma(tenantId);

  try {
    const { transporter, fromAddress, host } =
      await createTransporterForTenant(tenantId);

    const [template, recipient] = await Promise.all([
      prisma.template.findFirst({ where: { id: templateId } }),
      prisma.recipient.findFirst({ where: { id: recipientId } }),
    ]);

    if (!template) throw new Error(`Template ${templateId} not found`);
    if (!recipient) throw new Error(`Recipient ${recipientId} not found`);

    const trackedHtml = wrapTrackingLinks(
      injectTrackingPixel(template.body, campaignId, recipientId),
      campaignId,
      recipientId,
    );

    await transporter.sendMail({
      messageId: `<${Date.now()}.${recipientId}@${host}>`,
      from: fromAddress,
      to: recipient.email,
      subject: template.subject,
      html: trackedHtml,
      text: trackedHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
      headers: {
        "X-Campaign-Id": campaignId,
        "X-Template-Id": templateId,
        "X-Recipient-Id": recipientId,
        "X-Tenant-Id": tenantId,
        "X-SMTPAPI": JSON.stringify({
          unique_args: {
            campaignId,
            recipientId,
            tenantId,
          },
        }),
      },
    });

    await Promise.all([
      prisma.recipient.update({
        where: { id: recipientId },
        data: { status: "sent", sentAt: new Date() },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: { sentCount: { increment: 1 } },
      }),
      prisma.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 }, lastUsed: new Date() },
      }),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.REVALIDATION_SECRET;
    if (appUrl && secret) {
      // Fire-and-forget — a cache miss on the app side is non-fatal for delivery
      fetch(`${appUrl}/api/internal/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ campaignId }),
      }).catch(() => undefined);
    }
  } catch (err) {
    if (isLastAttempt) {
      // Final attempt exhausted — mark the recipient as bounced and tally it on the campaign
      await Promise.allSettled([
        prisma.recipient.update({
          where: { id: recipientId },
          data: { status: "bounced" },
        }),
        prisma.campaign.update({
          where: { id: campaignId },
          data: { bounceCount: { increment: 1 } },
        }),
      ]);

      console.error(
        JSON.stringify({
          event: "email_failed_final",
          campaignId,
          recipientId,
          attempt: job.retryCount + 1,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    // Re-throw so pg-boss marks the job failed and schedules the next retry
    throw err;
  }
}

async function main(): Promise<void> {
  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    // Neon routes through PgBouncer in transaction mode — session-pinned LISTEN/NOTIFY not available
    useListenNotify: false,
  });

  await boss.start();
  // Queue must exist before work() calls getQueueCache() — idempotent due to ON CONFLICT DO NOTHING.
  await boss.createQueue(QUEUE_NAME);

  // includeMetadata: true makes pg-boss deliver full JobWithMetadata objects (retryCount /
  // retryLimit). TypeScript can't resolve the WorkHandlerFor conditional type against a lambda
  // parameter, so we cast the array to match the runtime shape.
  await boss.work<EmailJob, void>(
    QUEUE_NAME,
    { localConcurrency: 1, includeMetadata: true } as const,
    async (jobs) => {
      for (const job of jobs as unknown as JobWithMetadata<EmailJob>[]) {
        await processEmail(job);
      }
    },
  );

  console.log(`Worker started — queue: ${QUEUE_NAME}`);

  // Minimal HTTP server so Railway (or any PaaS) can health-check the process
  const server = http.createServer((req, res) => {
    if (req.method !== "GET" || req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }
    const queues = boss.getWipData().length;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", queues }));
  });

  server.listen(PORT, () => console.log(`Health check listening on :${PORT}`));

  const shutdown = async (): Promise<void> => {
    console.log("Graceful shutdown…");
    server.close();
    await boss.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Worker startup failed:", err);
  process.exit(1);
});
