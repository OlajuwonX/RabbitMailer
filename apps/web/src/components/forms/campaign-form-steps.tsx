"use client";

import { LinearBadge, LinearInput } from "@/components/ui/linear";
import { cn } from "@/lib/utils/cn";
import type { RotationStrategy, Template } from "@repo/shared-types";

export interface ParsedEmails {
  valid: string[];
  invalid: string[];
}

export function DetailsStep({
  name,
  rotationStrategy,
  setName,
  setRotationStrategy,
}: {
  name: string;
  rotationStrategy: RotationStrategy;
  setName: (name: string) => void;
  setRotationStrategy: (strategy: RotationStrategy) => void;
}) {
  return (
    <div className="space-y-4">
      <LinearInput
        id="campaign-name"
        label="Campaign name"
        value={name}
        maxLength={100}
        onChange={(event) => setName(event.target.value)}
        hint={`${name.length}/100 characters`}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["sequential", "random"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRotationStrategy(value)}
            className={cn(
              "rounded-xl border p-4 text-left",
              rotationStrategy === value
                ? "border-violet-500/40 bg-violet-500/15"
                : "border-white/9 bg-white/3",
            )}
          >
            <p className="text-sm font-medium capitalize text-slate-100">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {value === "sequential"
                ? "Rotate templates in order."
                : "Pick a template randomly for each recipient."}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RecipientsStep({
  recipients,
  parsedEmails,
  setRecipients,
}: {
  recipients: string;
  parsedEmails: ParsedEmails;
  setRecipients: (recipients: string) => void;
}) {
  return (
    <div className="space-y-4">
      <textarea
        value={recipients}
        onChange={(event) => setRecipients(event.target.value)}
        className="min-h-44 w-full resize-y rounded-xl border border-white/9 bg-white/4 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-white/6 focus:outline-none"
        placeholder={"jane@example.com, alex@example.com\nteam@example.com"}
      />
      <input
        type="file"
        accept=".csv,text/csv"
        className="w-full rounded-xl border border-white/9 bg-white/4 px-3.5 py-2.5 text-sm text-slate-300"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void file.text().then(setRecipients);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <LinearBadge variant="info">
          {parsedEmails.valid.length} valid
        </LinearBadge>
        <LinearBadge
          variant={parsedEmails.invalid.length ? "danger" : "default"}
        >
          {parsedEmails.invalid.length} invalid
        </LinearBadge>
      </div>
      {parsedEmails.invalid.length > 0 && (
        <p className="text-sm text-red-400">
          {parsedEmails.invalid.slice(0, 5).join(", ")}
        </p>
      )}
      {parsedEmails.valid.length > 0 && (
        <p className="text-xs text-slate-500">
          Preview: {parsedEmails.valid.slice(0, 5).join(", ")}
        </p>
      )}
    </div>
  );
}

export function TemplatesStep({
  templates,
  selectedTemplateIds,
  search,
  setSearch,
  setSelectedTemplateIds,
}: {
  templates: Template[];
  selectedTemplateIds: string[];
  search: string;
  setSearch: (search: string) => void;
  setSelectedTemplateIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div className="space-y-4">
      <LinearInput
        id="template-search"
        label="Search templates"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {templates.map((template) => {
          const selected = selectedTemplateIds.includes(template.id);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() =>
                setSelectedTemplateIds((ids) =>
                  selected
                    ? ids.filter((id) => id !== template.id)
                    : [...ids, template.id],
                )
              }
              className={cn(
                "w-full rounded-xl border p-3 text-left",
                selected
                  ? "border-violet-500/40 bg-violet-500/15"
                  : "border-white/9 bg-white/3 hover:bg-white/5",
              )}
            >
              <p className="truncate text-sm font-medium text-slate-100">
                {template.subject}
              </p>
              <p className="text-xs text-slate-500">
                Used {template.usageCount.toLocaleString()} times
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
