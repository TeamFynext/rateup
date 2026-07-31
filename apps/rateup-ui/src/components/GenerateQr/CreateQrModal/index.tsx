import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconInfoCircle, IconPlus, IconQrcode } from "@tabler/icons-react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import { useCreateQrMutation, useUpdateQrMutation } from "@/backend/generateQr/generateQr.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

function CreateQrModal({
  opened,
  onClose,
  mode,
  shortUrlId,
  initialName,
}: {
  opened: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  shortUrlId: string;
  initialName: string;
}) {
  const { t: translations } = useTranslation();
  const formSchema = z.object({
    name: z
      .string()
      .min(3, translations("Name must be at least 3 characters long."))
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_\s]{2,}$/,
        translations("Name should be alphanumeric, start with a letter"),
      ),

    url: z.url(translations("Please enter a valid URL.")),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialName,
      url: "",
    },
  });

  const createQrMutation = useCreateQrMutation();
  const updateQrMutation = useUpdateQrMutation(shortUrlId);

  const handleCreateQrFormSubmit = useCallback(async (values: { name: string; url: string }) => {
    await createQrMutation.mutateAsync({
      name: values.name,
      link: values.url,
    });
    form.reset();
    onClose();
  }, []);

  const handleUpdateQrFormSubmit = useCallback(
    async (values: { name: string; url?: string }) => {
      const name = values.name;
      await updateQrMutation.mutateAsync({
        shortUrlId: shortUrlId,
        name,
      });
      form.reset();
      onClose();
    },
    [shortUrlId],
  );

  const handleCancelBtnClick = useCallback(() => {
    onClose();
    form.reset();
  }, [form]);

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <DialogHeader className="relative bg-primary text-white px-6 py-6 space-y-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>

          <div className="relative mx-auto w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
            <IconQrcode className="w-7 h-7 text-white" />
          </div>
          <div className="text-center relative">
            <DialogTitle className="text-xl font-semibold text-white">
              {mode === "create" ? translations("Create QR") : translations("Rename QR")}
            </DialogTitle>
            <p className="text-sm text-white/90 mt-1.5">
              {mode === "create" ? translations("Set up a QR Code") : translations("Rename the QR")}
            </p>
          </div>
          <DialogDescription className="sr-only">
            {mode === "create" ? translations("Create a new QR") : translations("Rename QR")}
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <form
          onSubmit={
            mode === "create"
              ? form.handleSubmit(handleCreateQrFormSubmit)
              : form.handleSubmit(handleUpdateQrFormSubmit)
          }
        >
          <FieldGroup className="px-6 py-5 gap-4">
            {/* Link Display Name */}
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="display-name" className="font-semibold">
                <div className="size-5 bg-primary rounded-md flex items-center justify-center shadow-sm">
                  <IconEdit className="size-3 text-white" />
                </div>
                {translations("QR Name")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="display-name"
                {...form.register("name")}
                onClick={(e) => e.stopPropagation()}
                aria-invalid={!!form.formState.errors.name}
                placeholder="Qr Name"
                className="h-11 shadow-sm"
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            {mode == "create" && (
              <Field data-invalid={!!form.formState.errors.url}>
                <FieldLabel htmlFor="qr-url" className="font-semibold">
                  <div className="size-5 bg-primary rounded-md flex items-center justify-center shadow-sm">
                    <IconEdit className="size-3 text-white" />
                  </div>
                  {translations("URL")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="qr-url"
                  {...form.register("url")}
                  onClick={(e) => e.stopPropagation()}
                  aria-invalid={!!form.formState.errors.url}
                  placeholder="QR url"
                  className="h-11 shadow-sm"
                />
                <FieldError errors={[form.formState.errors.url]} />
              </Field>
            )}

            {/* Info Box */}
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-rateup-darkblue dark:to-transparent border-l-4 border-primary rounded-r-lg p-3.5 flex gap-3">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <IconInfoCircle className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs leading-relaxed">
                <span className="font-semibold">{translations("Pro Tip")}:</span>{" "}
                {translations(
                  "QR codes let people access your link instantly—just scan and go, no typing needed",
                )}
              </p>
            </div>
          </FieldGroup>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t gap-3 sm:gap-3">
            <Button variant="outline" type="button" onClick={handleCancelBtnClick}>
              {translations("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mode === "create" ? createQrMutation.isPending : updateQrMutation.isPending}
            >
              {mode === "create" ? (
                <IconPlus data-icon="inline-start" />
              ) : (
                <IconEdit data-icon="inline-start" />
              )}
              {mode === "create" ? translations("Create QR") : translations("Rename QR")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateQrModal;
