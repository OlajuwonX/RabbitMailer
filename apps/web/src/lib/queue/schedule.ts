import "server-only";
import type { JobInsert } from "pg-boss";
import type { EmailJob } from "@repo/shared-types";
import { getBoss, EMAIL_QUEUE } from "./boss";

// 1 email per 2 minutes = 30 emails per hour per tenant. Enforced by pre-calculating send times at queue time, not with a runtime limiter.
const SEND_INTERVAL_MS = 2 * 60 * 1000;

// pg-boss will retry a failed job up to 3 times, waiting 30 s between attempts.
const RETRY_LIMIT = 3;
const RETRY_DELAY_SECONDS = 30;

export interface ScheduleEmailsOptions {
  tenantId: string;
  campaignId: string;
  // Each recipient carries its own templateId — rotation is decided by
  // sendCampaignAction before this function is called, so scheduling stays
  // unaware of rotation strategy and remains a pure bulk-insert.
  recipients: ReadonlyArray<{ id: string; templateId: string }>;
  /* Unix-epoch timestamp (ms) for the first email. Pass `scheduledFor.getTime()` for future-dated campaigns; omit for "send now".*/
  startAt?: number;
}

/* Schedules one pg-boss job per recipient in a single DB insert. Jobs are staggered by SEND_INTERVAL_MS so the worker naturally honours the 30 emails/hour rate — no external rate limiter is needed.*/
export async function scheduleCampaignEmails({
  tenantId,
  campaignId,
  recipients,
  startAt,
}: ScheduleEmailsOptions): Promise<void> {
  if (recipients.length === 0) return;

  const boss = await getBoss();
  // Capture a single "now" so all startAfter values are relative to the same moment, not drifted by how long each array iteration takes.
  const base = startAt ?? Date.now();

  const jobs: JobInsert<EmailJob>[] = recipients.map((recipient, index) => ({
    data: {
      tenantId,
      recipientId: recipient.id,
      campaignId,
      templateId: recipient.templateId,
    },
    // Each recipient gets a discrete send time; index 0 fires immediately (or at startAt), index 1 fires 2 min later, index 2 fires 4 min later, and so on.
    startAfter: new Date(base + index * SEND_INTERVAL_MS),
    retryLimit: RETRY_LIMIT,
    retryDelay: RETRY_DELAY_SECONDS,
  }));

  // boss.insert() sends all jobs in one SQL statement — far more efficient than calling boss.send() N times, especially for large recipient lists.
  const ids = await boss.insert(EMAIL_QUEUE, jobs, { returnId: true });

  if (ids === null) {
    // pg-boss returns null when the queue is blocked or the insert is rejected. Throw so sendCampaignAction can surface the failure instead of silently leaving recipients unscheduled.
    throw new Error(
      `pg-boss rejected job batch for campaign ${campaignId} — queue may not be initialised`,
    );
  }
}
