"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  ActionResult,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@repo/shared-types";

// HTML sanitization (no external dep — runs server-side only)

// Removes constructs that could execute JS if the HTML is ever rendered without escaping: script blocks, on* event attributes, and javascript: pseudo-schemes.
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(['"])[\s\S]*?\1/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript\s*:/gi, "#");
}

// Zod schemas

const createSchema = z.object({
  // name is optional — falls back to subject if omitted
  name: z.string().min(1).max(200).optional(),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),
  body: z.string().min(1, "Body is required"),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
});

const bulkItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),
  body: z.string().min(1, "Body is required"),
});

// Server Actions

export async function createTemplateAction(
  input: CreateTemplateInput,
): Promise<ActionResult<Template>> {
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

    const { subject, body } = parsed.data;
    const name = parsed.data.name ?? subject;
    const prisma = await getPrisma();

    const template = await prisma.template.create({
      data: {
        tenantId: user.tenantId,
        name,
        subject,
        body: sanitizeHtml(body),
        userId: user.id,
      },
    });

    revalidatePath("/templates");
    return { success: true, data: template as unknown as Template };
  } catch (err) {
    console.error("createTemplateAction:", err);
    return { success: false, error: "Failed to create template" };
  }
}

export async function updateTemplateAction(
  id: string,
  input: UpdateTemplateInput,
): Promise<ActionResult<Template>> {
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

    // $extends scopes by tenantId; userId is the explicit second ownership layer
    const existing = await prisma.template.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: "Template not found" };

    const { name, subject, body } = parsed.data;
    const updated = await prisma.template.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(body !== undefined && { body: sanitizeHtml(body) }),
      },
    });

    revalidatePath("/templates");
    return { success: true, data: updated as unknown as Template };
  } catch (err) {
    console.error("updateTemplateAction:", err);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const prisma = await getPrisma();

    // Verify ownership — tenantId from $extends, userId explicit
    const existing = await prisma.template.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: "Template not found" };

    // Block deletion while any linked campaign is actively sending — deleting the template mid-send would leave in-flight worker jobs unable to load it
    const activeSends = await prisma.campaignTemplate.count({
      where: { templateId: id, campaign: { status: "sending" } },
    });
    if (activeSends > 0) {
      return {
        success: false,
        error:
          "Cannot delete: template is linked to a campaign that is currently sending",
      };
    }

    await prisma.template.delete({ where: { id } });

    revalidatePath("/templates");
    return { success: true };
  } catch (err) {
    console.error("deleteTemplateAction:", err);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function bulkImportTemplatesAction(
  templates: CreateTemplateInput[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const parsed = z
      .array(bulkItemSchema)
      .min(1, "At least one template is required")
      .max(200, "Cannot import more than 200 templates at once")
      .safeParse(templates);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const prisma = await getPrisma();
    const { count } = await prisma.template.createMany({
      data: parsed.data.map((t) => ({
        tenantId: user.tenantId,
        name: t.name ?? t.subject,
        subject: t.subject,
        body: sanitizeHtml(t.body),
        userId: user.id,
      })),
    });

    revalidatePath("/templates");
    return { success: true, data: { count } };
  } catch (err) {
    console.error("bulkImportTemplatesAction:", err);
    return { success: false, error: "Failed to import templates" };
  }
}

export async function getTemplatesAction(): Promise<ActionResult<Template[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const prisma = await getPrisma();
    const templates = await prisma.template.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: templates as unknown as Template[] };
  } catch (err) {
    console.error("getTemplatesAction:", err);
    return { success: false, error: "Failed to load templates" };
  }
}
