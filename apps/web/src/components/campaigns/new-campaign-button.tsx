"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { CampaignForm } from "@/components/forms/campaign-form";
import { LinearButton } from "@/components/ui/linear";
import { useUiStore } from "@/lib/store/ui-store";

const MODAL_ID = "campaign:new";

export function NewCampaignButton() {
  const { activeModal, openModal, closeModal } = useUiStore();
  const open = activeModal === MODAL_ID;

  return (
    <>
      <LinearButton type="button" onClick={() => openModal(MODAL_ID)}>
        <Plus className="h-4 w-4" aria-hidden />
        New campaign
      </LinearButton>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => (next ? openModal(MODAL_ID) : closeModal())}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/10 bg-[#07070f] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <Dialog.Title className="text-base font-semibold text-slate-100">
                New campaign
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white/6 hover:text-slate-200"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <CampaignForm onSuccess={closeModal} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
