"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  ActionResult,
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
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
      return { success: false, error: "At least one valid recipient is required" };
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

export async function deleteCampaignAction(
  id: string,
): Promise<ActionResult> {
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
