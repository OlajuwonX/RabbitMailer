import { EmptyState } from "@/components/shared/empty-state";
import {
  BulkImportButton,
  NewTemplateButton,
} from "@/components/templates/template-actions";
import { TemplateGrid } from "@/components/templates/template-grid";
import { LinearTitle } from "@/components/ui/linear";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import type { Template } from "@repo/shared-types";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Templates - RabbitMailer" };

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prisma = await getPrisma();
  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <LinearTitle gradient size="lg" as="h1">
            Templates
          </LinearTitle>
          <p className="text-sm text-slate-500">
            {templates.length === 0
              ? "Create reusable HTML emails for your campaigns."
              : `${templates.length} template${
                  templates.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <BulkImportButton />
          <NewTemplateButton />
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden />}
            title="No templates yet"
            description="Create your first email template or import a CSV to start building campaigns."
          />
          {/* <div className="flex justify-center">
            <NewTemplateEmptyAction />
          </div> */}
        </div>
      ) : (
        <TemplateGrid templates={templates as Template[]} />
      )}
    </main>
  );
}
