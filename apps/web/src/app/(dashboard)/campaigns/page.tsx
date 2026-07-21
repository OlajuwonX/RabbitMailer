import { redirect } from "next/navigation";
import { LinearTitle } from "@/components/ui/linear";
import { CampaignList } from "@/components/campaigns/campaign-list";
import { NewCampaignButton } from "@/components/campaigns/new-campaign-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import type { Campaign } from "@repo/shared-types";

export const metadata = { title: "Campaigns - RabbitMailer" };

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prisma = await getPrisma();
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <LinearTitle gradient size="lg" as="h1">
            Campaigns
          </LinearTitle>
          <p className="text-sm text-slate-500">
            {campaigns.length === 0
              ? "Create your first campaign to start sending."
              : `${campaigns.length} campaign${
                  campaigns.length === 1 ? "" : "s"
                }`}
          </p>
        </div>
        <NewCampaignButton />
      </div>

      <CampaignList campaigns={campaigns as Campaign[]} />
    </main>
  );
}
