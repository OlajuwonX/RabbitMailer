import { type NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

// 1×1 transparent GIF — returned on every request, success or failure. Email clients must never receive an error response from a tracking pixel.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const PIXEL_RESPONSE = new Response(PIXEL, {
  headers: {
    "Content-Type": "image/gif",
    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
    Pragma: "no-cache",
  },
});

// cuid v1 pattern — 25 chars starting with 'c'. Matches what Prisma generates. uuid v4 pattern for uuid-based ids (Prisma @default(uuid()))
const VALID_ID = /^[a-zA-Z0-9_-]{20,36}$/;

function isValidId(id: string | null): id is string {
  return typeof id === "string" && VALID_ID.test(id);
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = request.nextUrl;
    const campaignId = searchParams.get("campaignId");
    const recipientId = searchParams.get("recipientId");

    // Validate params before any DB access
    if (!isValidId(campaignId) || !isValidId(recipientId)) {
      return PIXEL_RESPONSE;
    }

    // tenantId comes from middleware — always set even for public routes
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) return PIXEL_RESPONSE;

    const prisma = await getPrisma();

    // Verify the recipient exists and belongs to this tenant. Passing tenantId explicitly here rather than relying solely on $extends — this is a public route so belt-and-suspenders isolation matters.
    const recipient = await prisma.recipient.findFirst({
      where: { id: recipientId, tenantId, campaignId },
      select: { id: true, status: true },
    });
    if (!recipient) return PIXEL_RESPONSE;

    const userAgent = request.headers.get("user-agent") ?? undefined;
    // Prefer x-forwarded-for (set by Vercel/proxies); fall back to cf-connecting-ip
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("cf-connecting-ip") ??
      undefined;

    // Always record the engagement event — even repeat opens are valuable data
    await prisma.engagement.create({
      data: {
        tenantId,
        campaignId,
        recipientId,
        type: "open",
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      },
    });

    // Update recipient status only on the first open — updateMany with a status guard prevents overwriting 'clicked', 'bounced', or 'unsubscribed'. Using updateMany (not update) because it silently no-ops when no rows match.
    await prisma.recipient.updateMany({
      where: { id: recipientId, status: "sent" },
      data: { status: "opened", openedAt: new Date() },
    });

    // Increment campaign open count regardless of whether this is the first open
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { openCount: { increment: 1 } },
    });

    return PIXEL_RESPONSE;
  } catch {
    // Never expose errors to email clients — return the pixel unconditionally
    return PIXEL_RESPONSE;
  }
}
