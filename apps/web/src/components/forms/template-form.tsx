"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/app/actions/templates";
import { LinearButton, LinearInput } from "@/components/ui/linear";
import type { Template } from "@repo/shared-types";

const schema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required"),
});

export function TemplateForm({
  template,
  onSuccess,
}: {
  template?: Template;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const parsed = schema.safeParse({ subject, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid template");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = template
        ? await updateTemplateAction(template.id, parsed.data)
        : await createTemplateAction({
            name: parsed.data.subject,
            ...parsed.data,
          });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(template ? "Template updated" : "Template created");
      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <LinearInput
        id={template ? `subject-${template.id}` : "subject-new"}
        label="Subject"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        maxLength={200}
        error={error ?? undefined}
        hint={`${subject.length}/200 characters`}
        required
      />

      <div className="space-y-1.5">
        <label
          htmlFor={template ? `body-${template.id}` : "body-new"}
          className="block text-sm font-medium text-slate-300"
        >
          Body
        </label>
        <textarea
          id={template ? `body-${template.id}` : "body-new"}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-56 w-full resize-y rounded-xl border border-white/9 bg-white/4 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-white/6 focus:outline-none"
          placeholder="<p>Hello there...</p>"
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <LinearButton type="submit" loading={pending} fullWidth>
        {pending ? "Saving..." : "Save template"}
      </LinearButton>
    </form>
  );
}
