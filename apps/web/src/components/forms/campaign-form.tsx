"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  createCampaignAction,
  sendCampaignAction,
} from "@/app/actions/campaigns";
import { getTemplatesAction } from "@/app/actions/templates";
import { LinearButton } from "@/components/ui/linear";
import type { RotationStrategy, Template } from "@repo/shared-types";
import {
  DetailsStep,
  RecipientsStep,
  TemplatesStep,
} from "./campaign-form-steps";
import { ReviewStep, StepHeader } from "./campaign-form-summary";

const emailSchema = z.string().email();

function parseEmails(input: string) {
  const raw = input
    .split(/[\n,]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(raw)];
  return {
    valid: unique.filter((email) => emailSchema.safeParse(email).success),
    invalid: unique.filter((email) => !emailSchema.safeParse(email).success),
  };
}

export function CampaignForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [rotationStrategy, setRotationStrategy] =
    useState<RotationStrategy>("sequential");
  const [recipients, setRecipients] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const parsedEmails = useMemo(() => parseEmails(recipients), [recipients]);

  useEffect(() => {
    if (step !== 2 || templates.length > 0) return;
    void getTemplatesAction().then((result) => {
      if (result.success) setTemplates(result.data ?? []);
      else toast.error(result.error);
    });
  }, [step, templates.length]);

  const filteredTemplates = templates.filter((template) =>
    template.subject.toLowerCase().includes(search.toLowerCase()),
  );

  function canContinue() {
    if (step === 0) return name.trim().length > 0 && name.length <= 100;
    if (step === 1) {
      return parsedEmails.valid.length > 0 && parsedEmails.invalid.length === 0;
    }
    if (step === 2) return selectedTemplateIds.length > 0;
    return true;
  }

  function submit(sendNow: boolean) {
    setError(null);
    startTransition(async () => {
      const created = await createCampaignAction({
        name: name.trim(),
        recipientEmails: parsedEmails.valid,
        templateIds: selectedTemplateIds,
        rotationStrategy,
      });
      if (!created.success || !created.data) {
        const message = created.success
          ? "Campaign was not created"
          : created.error;
        setError(message);
        toast.error(message);
        return;
      }

      if (sendNow) {
        const sent = await sendCampaignAction(created.data.id);
        if (!sent.success) {
          setError(sent.error);
          toast.error(sent.error);
          return;
        }
        toast.success("Campaign queued");
      } else {
        toast.success("Campaign saved as draft");
      }

      router.refresh();
      router.push(`/campaigns/${created.data.id}`);
      onSuccess?.();
    });
  }

  return (
    <div className="space-y-5">
      <StepHeader step={step} selectedCount={selectedTemplateIds.length} />
      {step === 0 && (
        <DetailsStep
          name={name}
          rotationStrategy={rotationStrategy}
          setName={setName}
          setRotationStrategy={setRotationStrategy}
        />
      )}
      {step === 1 && (
        <RecipientsStep
          recipients={recipients}
          parsedEmails={parsedEmails}
          setRecipients={setRecipients}
        />
      )}
      {step === 2 && (
        <TemplatesStep
          templates={filteredTemplates}
          selectedTemplateIds={selectedTemplateIds}
          search={search}
          setSearch={setSearch}
          setSelectedTemplateIds={setSelectedTemplateIds}
        />
      )}
      {step === 3 && (
        <ReviewStep
          name={name}
          parsedEmails={parsedEmails}
          selectedTemplateIds={selectedTemplateIds}
          rotationStrategy={rotationStrategy}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <LinearButton
          type="button"
          variant="ghost"
          disabled={step === 0 || pending}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          Back
        </LinearButton>
        {step < 3 ? (
          <LinearButton
            type="button"
            disabled={!canContinue() || pending}
            onClick={() => setStep((value) => value + 1)}
          >
            Next
          </LinearButton>
        ) : (
          <div className="flex flex-wrap gap-2">
            <LinearButton
              type="button"
              variant="secondary"
              loading={pending}
              onClick={() => submit(false)}
            >
              Save as draft
            </LinearButton>
            <LinearButton
              type="button"
              loading={pending}
              onClick={() => submit(true)}
            >
              Send now
            </LinearButton>
          </div>
        )}
      </div>
    </div>
  );
}
