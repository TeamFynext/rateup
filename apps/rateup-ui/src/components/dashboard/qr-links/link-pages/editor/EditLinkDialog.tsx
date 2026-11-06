import { useTranslation } from "react-i18next";

import type { LinktreeLink } from "@/backend/linktree/linktree.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

import { CustomLinkFields, useCustomLinkForm } from "./CustomLinkFields.tsx";

export function EditLinkDialog({
  link,
  onOpenChange,
  onSave,
}: Readonly<{
  link: LinktreeLink;
  onOpenChange: (open: boolean) => void;
  onSave: (link: LinktreeLink) => Promise<void>;
}>) {
  const { t } = useTranslation();
  const form = useCustomLinkForm({
    linkDisplayName: link.linkDisplayName ?? "",
    linkUrl: link.linkUrl ?? "",
  });

  const submit = form.handleSubmit(async (values) => {
    await onSave({ ...link, ...values });
    onOpenChange(false);
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{t("Edit link")}</DialogTitle>
          </DialogHeader>
          <CustomLinkFields form={form} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
