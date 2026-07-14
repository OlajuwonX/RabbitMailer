"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { z } from "zod";
import { bulkImportTemplatesAction } from "@/app/actions/templates";
import { LinearButton } from "@/components/ui/linear";
import { cn } from "@/lib/utils/cn";
import type { CreateTemplateInput } from "@repo/shared-types";

const rowSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
});

type Tab = "paste" | "upload";

function parseCsv(csv: string) {
  return csv
    .split(/\r?\n/)
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const comma = trimmed.indexOf(",");
      if (comma === -1) {
        return { index, error: "Missing comma", value: null };
      }
      const value = {
        name: trimmed.slice(0, comma).trim(),
        subject: trimmed.slice(0, comma).trim(),
        body: trimmed.slice(comma + 1).trim(),
      };
      const parsed = rowSchema.safeParse(value);
      return parsed.success
        ? { index, error: null, value }
        : { index, error: parsed.error.issues[0]?.message, value: null };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function BulkImportForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("paste");
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const rows = useMemo(() => parseCsv(csv), [csv]);
  const valid = rows
    .map((row) => row.value)
    .filter((row): row is CreateTemplateInput => row !== null);
  const invalid = rows.filter((row) => row.error);

  function submit() {
    if (valid.length === 0) {
      toast.error("Add at least one valid template");
      return;
    }

    startTransition(async () => {
      const result = await bulkImportTemplatesAction(valid);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data?.count ?? valid.length} templates imported`);
      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl border border-white/9 bg-white/4 p-1">
        {(["paste", "upload"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              tab === value
                ? "bg-violet-500/20 text-violet-200"
                : "text-slate-500 hover:text-slate-200",
            )}
          >
            {value === "paste" ? "Paste CSV" : "Upload File"}
          </button>
        ))}
      </div>

      {tab === "paste" ? (
        <textarea
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          className="min-h-44 w-full resize-y rounded-xl border border-white/9 bg-white/4 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-white/6 focus:outline-none"
          placeholder={"Subject one,<p>Email body</p>\nSubject two,<p>More HTML</p>"}
        />
      ) : (
        <input
          type="file"
          accept=".csv,text/csv"
          className="w-full rounded-xl border border-white/9 bg-white/4 px-3.5 py-2.5 text-sm text-slate-300"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then(setCsv);
          }}
        />
      )}

      <div className="rounded-xl border border-white/7 bg-white/3 p-3">
        <p className="text-sm text-slate-300">
          {valid.length} valid templates will be imported
        </p>
        {invalid.length > 0 && (
          <p className="mt-1 text-xs text-red-400">
            {invalid.length} invalid row{invalid.length === 1 ? "" : "s"} need
            attention.
          </p>
        )}
      </div>

      {valid.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/7">
          {valid.slice(0, 5).map((row, index) => (
            <div key={`${row.subject}-${index}`} className="border-b border-white/5 p-3 last:border-0">
              <p className="truncate text-sm font-medium text-slate-200">
                {row.subject}
              </p>
              <p className="truncate text-xs text-slate-500">{row.body}</p>
            </div>
          ))}
        </div>
      )}

      <LinearButton
        type="button"
        loading={pending}
        fullWidth
        onClick={submit}
        disabled={valid.length === 0}
      >
        {pending ? "Importing..." : "Import templates"}
      </LinearButton>
    </div>
  );
}
