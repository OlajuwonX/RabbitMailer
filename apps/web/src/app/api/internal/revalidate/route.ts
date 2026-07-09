import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  const secret = process.env.REVALIDATION_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const campaignId =
    typeof body?.campaignId === "string" ? body.campaignId : null;

  revalidatePath("/campaigns");
  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`);
  }

  return NextResponse.json({ ok: true });
}
