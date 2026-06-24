import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Info, LinkIcon, Plus } from "lucide-react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import {
  useCreateLinktreeMutation,
  useUpdateLinktreeMutation,
} from "@/backend/linktree/linktree.query";
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

function CreateLinktreeModal({ opened, onClose, mode, shortUrlId, initialName }) {
  const { t: translations } = useTranslation();
  const formSchema = z.object({
    name: z
      .string()
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_\s]{2,}$/,
        translations(
          "Name should be alphanumeric, start with a letter, and be at least 3 characters.",
        ),
      ),
  });
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialName,
    },
  });

  const createLinktreeMutation = useCreateLinktreeMutation();
  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);

  const handleCreateLinktreeFormSubmit = useCallback(async (values) => {
    await createLinktreeMutation.mutateAsync(values);
    form.reset();
    onClose();
  }, []);

  const handleUpdateLinktreeFormSubmit = useCallback(async (values) => {
    const name = values.name;
    await updateLinktreeMutation.mutateAsync({ shortUrlId, name });
    form.reset();
    onClose();
  }, []);

  const handleCancelBtnClick = useCallback(() => {
    onClose();
    form.reset();
  }, [form]);

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with gradient background */}
        <DialogHeader className="relative bg-primary text-white px-6 py-6 space-y-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>

          <div className="relative mx-auto w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
            <LinkIcon className="w-7 h-7 text-white" />
          </div>
          <div className="text-center relative">
            <DialogTitle className="text-xl font-semibold text-white">
              {mode === "create"
                ? translations("Create Access Link")
                : translations("Rename Access Link")}
            </DialogTitle>
            <p className="text-sm text-white/90 mt-1.5">
              {mode === "create"
                ? translations("Set up a quick access link for your campaigns")
                : translations("Rename the quick access link for your campaigns")}
            </p>
          </div>
          <DialogDescription className="sr-only">
            {mode === "create"
              ? translations("Create a new quick access link")
              : translations("Rename quick access link")}
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <form
          onSubmit={
            mode === "create"
              ? form.handleSubmit(handleCreateLinktreeFormSubmit)
              : form.handleSubmit(handleUpdateLinktreeFormSubmit)
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
                {translations("Access Link Name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="display-name"
                {...form.register("name")}
                onClick={(e) => e.stopPropagation()}
                placeholder="Summer Campaign Survey Link"
                className="w-full h-11 shadow-sm"
              />

              {form.formState.errors.name?.message && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.name.message?.toString()}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-rateup-darkblue dark:to-transparent border-l-4 border-primary rounded-r-lg p-3.5 flex gap-3">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs leading-relaxed">
                <span className="font-semibold">{translations("Pro Tip")}:</span>{" "}
                {translations(
                  "Access links can be shared via QR codes, social media, or embedded directly in your campaigns for maximum reach",
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
              disabled={
                mode === "create"
                  ? createLinktreeMutation.isPending
                  : updateLinktreeMutation.isPending
              }
              className="bg-primary"
            >
              {mode === "create" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Edit className="w-4 h-4 mr-2" />
              )}
              {mode === "create" ? translations("Create Link") : translations("Rename Link")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateLinktreeModal;
