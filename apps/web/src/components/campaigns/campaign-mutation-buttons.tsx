"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  deleteCampaignAction,
  pauseCampaignAction,
  sendCampaignAction,
} from "@/app/actions/campaigns";
import { LinearButton } from "@/components/ui/linear";
import type { CampaignStatus } from "@repo/shared-types";

export function CampaignMutationButtons({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ success: true } | { success: false; error: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "draft" || status === "paused") && (
        <LinearButton
          type="button"
          size="sm"
          loading={pending}
          onClick={() =>
            run(() => sendCampaignAction(campaignId), "Campaign queued")
          }
        >
          Send now
        </LinearButton>
      )}
      {status === "sending" && (
        <LinearButton
          type="button"
          size="sm"
          variant="secondary"
          loading={pending}
          onClick={() =>
            run(() => pauseCampaignAction(campaignId), "Campaign paused")
          }
        >
          Pause
        </LinearButton>
      )}
      {(status === "draft" || status === "completed") && (
        <LinearButton
          type="button"
          size="sm"
          variant="danger"
          loading={pending}
          onClick={() => {
            if (!window.confirm("Delete this campaign?")) return;
            run(() => deleteCampaignAction(campaignId), "Campaign deleted");
          }}
        >
          Delete
        </LinearButton>
      )}
    </div>
  );
}
