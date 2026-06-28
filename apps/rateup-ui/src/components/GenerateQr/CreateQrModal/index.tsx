import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Info, Plus, QrCode } from "lucide-react";
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
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

function CreateQrModal({ opened, onClose, mode, shortUrlId, initialName }) {
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

  const handleCreateQrFormSubmit = useCallback(async (values) => {
    await createQrMutation.mutateAsync({
      name: values.name,
      link: values.url,
    });
    form.reset();
    onClose();
  }, []);

  const handleUpdateQrFormSubmit = useCallback(
    async (values) => {
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
            <QrCode className="w-7 h-7 text-white" />
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
          <div className="px-6 py-5 space-y-4">
            {/* Link Display Name */}
            <div className="space-y-2">
              <Label
                htmlFor="display-name"
                className="text-sm font-semibold flex items-center gap-2"
              >
                <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center shadow-sm">
                  <Edit className="w-3 h-3 text-white" />
                </div>
                {translations("QR Name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="display-name"
                {...form.register("name")}
                onClick={(e) => e.stopPropagation()}
                placeholder="Qr Name"
                className="w-full h-11 shadow-sm"
              />

              {form.formState.errors.name?.message && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.name.message?.toString()}
                </p>
              )}
            </div>
            {mode == "create" && (
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center shadow-sm">
                    <Edit className="w-3 h-3 text-white" />
                  </div>
                  {translations("URL")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="display-name"
                  {...form.register("url")}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="QR url"
                  className="w-full h-11 shadow-sm"
                />

                {form.formState.errors.url?.message && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.url.message}</p>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-rateup-darkblue dark:to-transparent border-l-4 border-primary rounded-r-lg p-3.5 flex gap-3">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs leading-relaxed">
                <span className="font-semibold">{translations("Pro Tip")}:</span>{" "}
                {translations(
                  "QR codes let people access your link instantly—just scan and go, no typing needed",
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t gap-3 sm:gap-3">
            <Button variant="outline" type="button" onClick={handleCancelBtnClick}>
              {translations("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mode === "create" ? createQrMutation.isPending : updateQrMutation.isPending}
              className="bg-primary"
            >
              {mode === "create" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Edit className="w-4 h-4 mr-2" />
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
