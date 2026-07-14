"use client";

import { FileUp, Plus } from "lucide-react";
import { BulkImportForm } from "@/components/forms/bulk-import-form";
import { TemplateForm } from "@/components/forms/template-form";
import { LinearButton } from "@/components/ui/linear";
import { useUiStore } from "@/lib/store/ui-store";
import { TemplateDialog } from "./template-dialog";

const NEW_MODAL = "template:new";
const BULK_MODAL = "template:bulk";

export function NewTemplateButton() {
  const { activeModal, openModal, closeModal } = useUiStore();
  const open = activeModal === NEW_MODAL;

  return (
    <>
      <LinearButton type="button" onClick={() => openModal(NEW_MODAL)}>
        <Plus className="h-4 w-4" aria-hidden />
        New template
      </LinearButton>
      <TemplateDialog
        open={open}
        onOpenChange={(next) => (next ? openModal(NEW_MODAL) : closeModal())}
        title="New template"
      >
        <TemplateForm onSuccess={closeModal} />
      </TemplateDialog>
    </>
  );
}

export function BulkImportButton() {
  const { activeModal, openModal, closeModal } = useUiStore();
  const open = activeModal === BULK_MODAL;

  return (
    <>
      <LinearButton
        type="button"
        variant="secondary"
        onClick={() => openModal(BULK_MODAL)}
      >
        <FileUp className="h-4 w-4" aria-hidden />
        Bulk import
      </LinearButton>
      <TemplateDialog
        open={open}
        onOpenChange={(next) => (next ? openModal(BULK_MODAL) : closeModal())}
        title="Bulk import templates"
      >
        <BulkImportForm onSuccess={closeModal} />
      </TemplateDialog>
    </>
  );
}

export function NewTemplateEmptyAction() {
  const openModal = useUiStore((state) => state.openModal);

  return (
    <LinearButton
      type="button"
      variant="secondary"
      onClick={() => openModal(NEW_MODAL)}
    >
      <Plus className="h-4 w-4" aria-hidden />
      Create your first template
    </LinearButton>
  );
}
