"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { EMAIL_QUEUE } from "@/lib/queue/boss";
import { scheduleCampaignEmails } from "@/lib/queue/schedule";
import type {
  ActionResult,
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  QueueCounts,
} from "@repo/shared-types";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z
    .string()
    .min(1, "Campaign name is required")
    .max(100, "Campaign name must be 100 characters or less"),
  templateIds: z
    .array(z.string().min(1))
    .min(1, "At least one template is required"),
  // Validated individually below so we can surface ALL invalid addresses at once
  recipientEmails: z
    .array(z.string())
    .min(1, "At least one recipient is required"),
  rotationStrategy: z.enum(["sequential", "random"]),
  scheduledFor: z.date().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // null clears the scheduled date; undefined leaves it unchanged
  scheduledFor: z.date().nullable().optional(),
});

// Lightweight RFC 5322 check — identical pattern used by the campaign wizard
// client-side validator so behaviour is consistent on both sides.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function createCampaignAction(
  input: CreateCampaignInput,
): Promise<ActionResult<Campaign>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const { name, templateIds, rotationStrategy, scheduledFor } = parsed.data;

    // Deduplicate and normalise before validation so the user isn't shown
    // "duplicate address" errors on top of format errors.
    const uniqueEmails = [
      ...new Set(
        parsed.data.recipientEmails.map((e) => e.toLowerCase().trim()),
      ),
    ].filter((e) => e.length > 0);

    if (uniqueEmails.length === 0) {
      return {
        success: false,
        error: "At least one valid recipient is required",
      };
    }

    // Collect ALL invalid addresses — return them together so the user can fix
    // everything in one pass rather than discovering errors one at a time.
    const invalidEmails = uniqueEmails.filter((e) => !EMAIL_RE.test(e));
    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email address${invalidEmails.length === 1 ? "" : "es"}: ${invalidEmails.join(", ")}`,
      };
    }

    const prisma = await getPrisma();

    // Verify every templateId exists and belongs to this user.
    // $extends adds tenantId; userId is the explicit second ownership layer.
    const foundTemplates = await prisma.template.findMany({
      where: { id: { in: templateIds }, userId: user.id },
      select: { id: true },
    });
    if (foundTemplates.length !== templateIds.length) {
      return { success: false, error: "One or more templates were not found" };
    }

    // Create campaign + CampaignTemplate rows in one statement.
    // tenantId must be explicit in nested createMany — $extends only intercepts
    // the top-level campaign.create, not the nested relation write.
    const campaign = await prisma.campaign.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        name,
        rotationStrategy,
        totalRecipients: uniqueEmails.length,
        scheduledFor: scheduledFor ?? null,
        campaignTemplates: {
          createMany: {
            data: templateIds.map((templateId, index) => ({
              tenantId: user.tenantId,
              templateId,
              order: index,
            })),
          },
        },
      },
    });

    // Bulk-insert all recipients — one SQL statement regardless of list size.
    // templateId is null here; sendCampaignAction assigns it per-recipient.
    await prisma.recipient.createMany({
      data: uniqueEmails.map((email) => ({
        tenantId: user.tenantId,
        campaignId: campaign.id,
        email,
      })),
    });

    revalidatePath("/campaigns");
    return { success: true, data: campaign as unknown as Campaign };
  } catch (err) {
    console.error("createCampaignAction:", err);
    return { success: false, error: "Failed to create campaign" };
  }
}

export async function updateCampaignAction(
  id: string,
  input: UpdateCampaignInput,
): Promise<ActionResult<Campaign>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const prisma = await getPrisma();

    // Ownership: $extends scopes by tenantId; userId is the explicit second layer
    const existing = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
      select: { status: true },
    });
    if (!existing) return { success: false, error: "Campaign not found" };
    if (existing.status !== "draft") {
      return {
        success: false,
        error: "Only draft campaigns can be edited",
      };
    }

    const { name, scheduledFor } = parsed.data;
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(scheduledFor !== undefined && { scheduledFor }),
      },
    });

    revalidatePath("/campaigns");
    return { success: true, data: updated as unknown as Campaign };
  } catch (err) {
    console.error("updateCampaignAction:", err);
    return { success: false, error: "Failed to update campaign" };
  }
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const prisma = await getPrisma();

    const existing = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
      select: { status: true },
    });
    if (!existing) return { success: false, error: "Campaign not found" };

    if (existing.status === "sending") {
      return {
        success: false,
        error: "Cannot delete a campaign that is currently sending",
      };
    }
    if (existing.status !== "draft" && existing.status !== "completed") {
      return {
        success: false,
        error: `Cannot delete a campaign with status "${existing.status}" — only draft or completed campaigns can be deleted`,
      };
    }

    // Cascade in schema removes CampaignTemplate, Recipient, and Engagement rows
    await prisma.campaign.delete({ where: { id } });

    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("deleteCampaignAction:", err);
    return { success: false, error: "Failed to delete campaign" };
  }
}

export async function sendCampaignAction(
  campaignId: string,
): Promise<ActionResult<{ jobsQueued: number }>> {
  let lockedCampaign:
    | { id: string; status: "draft" | "paused"; userId: string }
    | null = null;

  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const prisma = await getPrisma();

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: user.id },
      select: {
        id: true,
        status: true,
        rotationStrategy: true,
        scheduledFor: true,
      },
    });
    if (!campaign) return { success: false, error: "Campaign not found" };
    if (campaign.status !== "draft" && campaign.status !== "paused") {
      return {
        success: false,
        error: "Campaign must be in draft or paused status to send",
      };
    }

    const lock = await prisma.campaign.updateMany({
      where: {
        id: campaignId,
        userId: user.id,
        status: campaign.status,
      },
      data: { status: "queued" },
    });
    if (lock.count !== 1) {
      return {
        success: false,
        error: "Campaign is already being queued or sent",
      };
    }
    lockedCampaign = {
      id: campaignId,
      status: campaign.status,
      userId: user.id,
    };

    // Load pending recipients in creation order — order matters for sequential rotation
    const pendingRecipients = await prisma.recipient.findMany({
      where: { campaignId, status: "pending" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (pendingRecipients.length === 0) {
      return { success: false, error: "No pending recipients found" };
    }

    // Load templates in the order they were linked (order field set at campaign create)
    const campaignTemplates = await prisma.campaignTemplate.findMany({
      where: { campaignId },
      orderBy: { order: "asc" },
      select: { templateId: true },
    });
    if (campaignTemplates.length === 0) {
      return { success: false, error: "No templates linked to this campaign" };
    }

    const templateIds = campaignTemplates.map((ct) => ct.templateId);

    // Assign a templateId to every recipient according to the rotation strategy.
    // Done in memory — no DB round trips per recipient.
    const recipientsWithTemplates = pendingRecipients.map((r, index) => ({
      id: r.id,
      templateId:
        campaign.rotationStrategy === "sequential"
          ? templateIds[index % templateIds.length]!
          : templateIds[Math.floor(Math.random() * templateIds.length)]!,
    }));

    // Persist assignments: group by templateId so we do O(templates) updateMany
    // calls instead of O(recipients) individual updates.
    const byTemplate = new Map<string, string[]>();
    for (const r of recipientsWithTemplates) {
      const group = byTemplate.get(r.templateId) ?? [];
      group.push(r.id);
      byTemplate.set(r.templateId, group);
    }
    await Promise.all(
      [...byTemplate.entries()].map(([templateId, ids]) =>
        prisma.recipient.updateMany({
          where: { id: { in: ids } },
          data: { templateId },
        }),
      ),
    );

    // Schedule all jobs in one pg-boss bulk insert. startAfter times are
    // pre-calculated here so the 30 emails/hour rate is enforced without any
    // runtime limiter. Honour scheduledFor if the campaign has a future start time.
    const startAt =
      campaign.scheduledFor && campaign.scheduledFor > new Date()
        ? campaign.scheduledFor.getTime()
        : undefined;

    await scheduleCampaignEmails({
      tenantId: user.tenantId,
      campaignId,
      recipients: recipientsWithTemplates,
      startAt,
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending", startedAt: new Date() },
    });
    lockedCampaign = null;

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, data: { jobsQueued: pendingRecipients.length } };
  } catch (err) {
    if (lockedCampaign) {
      try {
        const prisma = await getPrisma();
        await prisma.campaign.updateMany({
          where: {
            id: lockedCampaign.id,
            userId: lockedCampaign.userId,
            status: "queued",
          },
          data: { status: lockedCampaign.status },
        });
      } catch (rollbackErr) {
        console.error("sendCampaignAction rollback:", rollbackErr);
      }
    }
    console.error("sendCampaignAction:", err);
    return { success: false, error: "Failed to start campaign" };
  }
}

export async function pauseCampaignAction(
  campaignId: string,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const prisma = await getPrisma();

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: user.id },
      select: { status: true },
    });
    if (!campaign) return { success: false, error: "Campaign not found" };
    if (campaign.status !== "sending") {
      return { success: false, error: "Only sending campaigns can be paused" };
    }

    // Jobs already in the pg-boss queue continue processing — pause only
    // prevents new jobs from being scheduled if sendCampaignAction is called again.
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "paused" },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (err) {
    console.error("pauseCampaignAction:", err);
    return { success: false, error: "Failed to pause campaign" };
  }
}

// Called by the QueueStatusWidget Client Component on a polling interval.
// Returns live pg-boss counts — no revalidation needed.
// pg-boss v12 does not expose a countStates() method, so we query the
// pgboss.job table directly. $queryRaw bypasses $extends — no tenant filter
// needed here since queue counts are infrastructure-level metrics.
export async function getQueueStatusAction(): Promise<QueueCounts> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        pending: 0,
        sent: 0,
        failed: 0,
        total: 0,
        estimatedCompletionAt: null,
      };
    }
    void (await headers()).get("x-tenant-id"); // confirms request context is live
    const prisma = await getPrisma();

    const rows = await prisma.$queryRaw<
      Array<{ state: string; count: number }>
    >`
      SELECT state, COUNT(*)::int AS count
      FROM pgboss.job
      WHERE name = ${EMAIL_QUEUE}
        AND data->>'tenantId' = ${user.tenantId}
      GROUP BY state
    `;

    const s = Object.fromEntries(rows.map((r) => [r.state, r.count]));
    const pending = (s.created ?? 0) + (s.retry ?? 0);
    const active = s.active ?? 0;
    const completed = s.completed ?? 0;
    const failed = s.failed ?? 0;
    const cancelled = s.cancelled ?? 0;
    const total = pending + active + completed + failed + cancelled;

    const remaining = pending + active;
    const estimatedCompletionAt =
      remaining > 0 ? new Date(Date.now() + remaining * 2 * 60 * 1000) : null;

    return {
      pending: pending + active,
      sent: completed,
      failed,
      total,
      estimatedCompletionAt,
    };
  } catch {
    return {
      pending: 0,
      sent: 0,
      failed: 0,
      total: 0,
      estimatedCompletionAt: null,
    };
  }
}
