"use client";

import { useCallback, useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Edit, Info, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import {
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
} from "@/backend/landingPage/landingPage.query";
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

function CreateLandingPageModal({
  opened,
  onClose,
  mode,
  shortUrlId,
  initialName,
}) {
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

  const createLandingPageMutation = useCreateLandingPageMutation();
  const updateLandingPageMutation = useUpdateLandingPageMutation(shortUrlId);

  const formSubmitBtnRef = useRef(null);

  const handleCreateLandingPageFormSubmit = useCallback(async (values) => {
    await createLandingPageMutation.mutateAsync(values);
    form.reset();
    onClose();
  }, []);

  const handleUpdateLandingPageFormSubmit = useCallback(async (values) => {
    const name = values.name;
    await updateLandingPageMutation.mutateAsync({ shortUrlId, name });
    form.reset();
    onClose();
  }, []);

  const handleCreateLinkBtnClick = useCallback(() => {
    formSubmitBtnRef?.current.click();
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
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="text-center relative">
            <DialogTitle className="text-xl font-semibold text-white">
              {mode === "create"
                ? translations("Create Landing Page")
                : translations("Rename Landing Page")}
            </DialogTitle>
            <p className="text-sm text-white/90 mt-1.5">
              {mode === "create"
                ? translations("Set up a new landing page for your campaigns")
                : translations("Rename the landing page for your campaigns")}
            </p>
          </div>
          <DialogDescription className="sr-only">
            {mode === "create"
              ? translations("Create a new landing page")
              : translations("Rename landing page")}
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <form
          onSubmit={
            mode === "create"
              ? form.handleSubmit(handleCreateLandingPageFormSubmit)
              : form.handleSubmit(handleUpdateLandingPageFormSubmit)
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
                {translations("Landing Page Name")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="display-name"
                {...form.register("name")}
                onClick={(e) => e.stopPropagation()}
                placeholder="Summer Campaign Landing Page"
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
                <span className="font-semibold">
                  {translations("Pro Tip")}:
                </span>{" "}
                {translations(
                  "Landing pages can be customized with your brand colors, images, and content to maximize conversions",
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t gap-3 sm:gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={handleCancelBtnClick}
            >
              {translations("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                mode === "create"
                  ? createLandingPageMutation.isPending
                  : updateLandingPageMutation.isPending
              }
              className="bg-primary"
            >
              {mode === "create" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Edit className="w-4 h-4 mr-2" />
              )}
              {mode === "create"
                ? translations("Create Page")
                : translations("Rename Page")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateLandingPageModal;
