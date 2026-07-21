import { LinearBadge } from "@/components/ui/linear";
import type { CampaignStatus } from "@repo/shared-types";

const STATUS: Record<
  CampaignStatus,
  { label: string; variant: "default" | "info" | "warning" | "success" | "danger" }
> = {
  draft: { label: "Draft", variant: "default" },
  queued: { label: "Queued", variant: "info" },
  sending: { label: "Sending", variant: "info" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = STATUS[status];
  return <LinearBadge variant={config.variant}>{config.label}</LinearBadge>;
}
