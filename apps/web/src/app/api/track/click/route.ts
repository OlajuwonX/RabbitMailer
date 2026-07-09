import { type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

const VALID_ID = /^[a-zA-Z0-9_-]{20,36}$/;

function isValidId(id: string | null): id is string {
  return typeof id === "string" && VALID_ID.test(id);
}

// On any failure redirect here — never expose errors or leave the user stranded
function safeFallback(): Response {
  return Response.redirect(process.env.NEXT_PUBLIC_APP_URL ?? "/", 302);
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = request.nextUrl;
    const campaignId = searchParams.get("campaignId");
    const recipientId = searchParams.get("recipientId");
    const rawUrl = searchParams.get("url");

    if (!isValidId(campaignId) || !isValidId(recipientId) || !rawUrl) {
      return safeFallback();
    }

    // Validate the redirect target before touching the DB.
    // Restricting to http/https prevents javascript:, data:, and other
    // schemes from being used as redirect destinations.
    let decodedUrl: string;
    try {
      const parsed = new URL(decodeURIComponent(rawUrl));
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return safeFallback();
      }
      decodedUrl = parsed.toString();
    } catch {
      return safeFallback();
    }

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) return safeFallback();

    const prisma = await getPrisma();

    // Verify recipient exists and belongs to this tenant + campaign
    const recipient = await prisma.recipient.findFirst({
      where: { id: recipientId, tenantId, campaignId },
      select: { id: true, status: true },
    });
    if (!recipient) return safeFallback();

    const userAgent = request.headers.get("user-agent") ?? null;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("cf-connecting-ip") ??
      null;

    // Record every click event — repeat clicks are valid engagement data
    await prisma.engagement.create({
      data: {
        tenantId,
        campaignId,
        recipientId,
        type: "click",
        url: decodedUrl,
        userAgent,
        ip,
      },
    });

    // Advance status to 'clicked' only from 'sent' or 'opened' — a recipient
    // who clicks without opening (image-blocked client) still advances correctly.
    // updateMany silently no-ops if status is already 'clicked', 'bounced', etc.
    await prisma.recipient.updateMany({
      where: { id: recipientId, status: { in: ["sent", "opened"] } },
      data: { status: "clicked", clickedAt: new Date() },
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { clickCount: { increment: 1 } },
    });

    return Response.redirect(decodedUrl, 302);
  } catch {
    return safeFallback();
  }
}
