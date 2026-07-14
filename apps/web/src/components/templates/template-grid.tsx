import { TemplateCard } from "@/components/ui/template-card";
import type { Template } from "@repo/shared-types";

export function TemplateGrid({ templates }: { templates: Template[] }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}
