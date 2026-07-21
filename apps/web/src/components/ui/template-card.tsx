"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Edit3, Trash2 } from "lucide-react";
import { deleteTemplateAction } from "@/app/actions/templates";
import { TemplateForm } from "@/components/forms/template-form";
import { LinearBadge, LinearButton, LinearCard } from "@/components/ui/linear";
import { useUiStore } from "@/lib/store/ui-store";
import type { Template } from "@repo/shared-types";
import { TemplateDialog } from "../templates/template-dialog";

function formatRelative(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.round(diffMs / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (days < 1) return formatter.format(0, "day");
  if (days < 30) return formatter.format(-days, "day");
  return formatter.format(-Math.round(days / 30), "month");
}

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function TemplateCard({ template }: { template: Template }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { activeModal, openModal, closeModal } = useUiStore();
  const modalId = `template:${template.id}`;
  const open = activeModal === modalId;

  function deleteTemplate() {
    if (!window.confirm("Delete this template?")) return;

    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Template deleted");
      router.refresh();
    });
  }

  return (
    <LinearCard padding="md" hover>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="truncate text-sm font-semibold text-slate-100">
            {template.subject.length > 80
              ? `${template.subject.slice(0, 80)}...`
              : template.subject}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Used {template.usageCount.toLocaleString()} times</span>
            <span>Open rate {pct(template.openCount, template.usageCount)}</span>
            <span>Clicks {template.clickCount.toLocaleString()}</span>
          </div>
          <LinearBadge variant="default">
            {template.lastUsed
              ? `Last used ${formatRelative(template.lastUsed)}`
              : `Created ${formatRelative(template.createdAt)}`}
          </LinearBadge>
        </div>

        <div className="flex shrink-0 gap-2">
          <LinearButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => openModal(modalId)}
          >
            <Edit3 className="h-4 w-4" aria-hidden />
            Edit
          </LinearButton>
          <LinearButton
            type="button"
            variant="danger"
            size="sm"
            loading={pending}
            onClick={deleteTemplate}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </LinearButton>
        </div>
      </div>

      <TemplateDialog
        open={open}
        onOpenChange={(next) => (next ? openModal(modalId) : closeModal())}
        title="Edit template"
      >
        <TemplateForm template={template} onSuccess={closeModal} />
      </TemplateDialog>
    </LinearCard>
  );
}
