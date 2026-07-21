import { cn } from "@/lib/utils/cn";
import type { RotationStrategy } from "@repo/shared-types";
import type { ParsedEmails } from "./campaign-form-steps";

export const CAMPAIGN_STEPS = [
  "Details",
  "Recipients",
  "Templates",
  "Review",
] as const;

export function StepHeader({
  step,
  selectedCount,
}: {
  step: number;
  selectedCount: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CAMPAIGN_STEPS.map((label, index) => (
        <div
          key={label}
          className={cn(
            "rounded-lg border px-2 py-2 text-center text-xs font-medium",
            index === step
              ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
              : "border-white/7 text-slate-500",
          )}
        >
          {label}
          {index === 2 && selectedCount > 0 && (
            <span className="ml-1 text-violet-300">({selectedCount})</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReviewStep({
  name,
  parsedEmails,
  selectedTemplateIds,
  rotationStrategy,
}: {
  name: string;
  parsedEmails: ParsedEmails;
  selectedTemplateIds: string[];
  rotationStrategy: RotationStrategy;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/3 p-4 text-sm text-slate-300">
      <p>Name: {name}</p>
      <p>Recipients: {parsedEmails.valid.length}</p>
      <p>Templates: {selectedTemplateIds.length}</p>
      <p className="capitalize">Rotation: {rotationStrategy}</p>
    </div>
  );
}
