import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { chatbotKeys, useUpdateChatbotMutation } from "@/backend/chatbots/chatbots.query.ts";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { RequestPayloadFields } from "@/types/api.ts";
import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform, automationPlatformOf } from "@/types/platform.ts";

// ─── Unsaved Changes Confirmation Dialog ──────────────────────────────────────

interface ConfirmDiscardProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDiscardDialog({ open, onConfirm, onCancel }: Readonly<ConfirmDiscardProps>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Discard Changes?")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("You have unsaved changes. Are you sure you want to discard them?")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("Keep Editing")}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
            {t("Discard")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

type AutomatedReplyFormValues = {
  name: string;
  platform: AutomationPlatform | string;
  matchData: WaAutomatedReply["matchData"];
  whatsappSettingsPhoneId: string | null;
  /** Present once an existing reply is loaded for editing. */
  id?: string;
  /** The editor also round-trips the reply's other columns untouched. */
} & RequestPayloadFields;

function getInitialValues(
  initialValues: WaAutomatedReply,
  forcedPlatform?: AutomationPlatform,
): AutomatedReplyFormValues {
  return {
    ...initialValues,
    platform: forcedPlatform ?? initialValues.platform ?? AutomationPlatform.WHATSAPP,
  };
}

// ─── Form ──────────────────────────────────────────────────────────────────────

interface AutoPilotFormProps {
  initialValues: WaAutomatedReply;
  close?: () => void;
  platform?: AutomationPlatform;
}

/**
 * A chatbot's settings (its name, and the WhatsApp number for WhatsApp ones), opened from the
 * editor. New chatbots are made in the creation wizard (`components/dashboard/chatbots`).
 */
export function AutomatedReplyForm({
  initialValues,
  close,
  // No default: when editing, an absent prop must leave the chatbot's own platform alone
  // (a WhatsApp default here used to turn an Instagram chatbot into a WhatsApp one on save).
  platform,
}: Readonly<AutoPilotFormProps>) {
  const { t } = useTranslation();

  // FIX: Added validation rules
  const formSchema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("Journey name is required"))
      .min(3, t("Name must be at least 3 characters")),
  });

  const rootForm = useForm<AutomatedReplyFormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<AutomatedReplyFormValues>,
    defaultValues: getInitialValues(initialValues, platform),
  });

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  // FIX: Track save success to show inline confirmation
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    rootForm.reset(getInitialValues(initialValues, platform));
  }, [initialValues, platform]);

  useEffect(() => {
    if (!platform) return;
    rootForm.setValue("platform", platform);
  }, [platform]);

  const qc = useQueryClient();
  const searchParams = useSearch({ strict: false });
  const waAutomatedReplyId =
    typeof searchParams.waAutomatedReplyId === "string" ? searchParams.waAutomatedReplyId : "";

  // Every channel saves through /api/chatbots.
  const updateMutation = useUpdateChatbotMutation();
  const platformValue = automationPlatformOf(rootForm.watch("platform"));
  const metaPlatform = platformValue === AutomationPlatform.WHATSAPP ? null : platformValue;
  const isDirty = rootForm.formState.isDirty;

  // FIX: Guard cancel with confirmation if form has unsaved changes
  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true);
    } else {
      rootForm.reset();
      close?.();
    }
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false);
    rootForm.reset();
    close?.();
  }

  function handleSubmitClick() {
    const data = rootForm.getValues();
    const id = data.id ?? waAutomatedReplyId ?? "";

    updateMutation.mutate(
      { ...data, id },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: chatbotKeys.detail(id) });
          toast.success(t("Journey settings saved"));
          setSaveSuccess(true);
        },
      },
    );
  }

  const isSaving = updateMutation.isPending;

  let submitLabel = t("Save changes");
  if (isSaving) {
    submitLabel = t("Saving…");
  } else if (saveSuccess) {
    submitLabel = t("Saved");
  }

  return (
    <TooltipProvider>
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setConfirmDiscardOpen(false)}
      />
      <form onSubmit={rootForm.handleSubmit(handleSubmitClick)} className="space-y-6" noValidate>
        <Card className="m-1">
          {/* FIX: Template button moved into CardHeader as a secondary action */}
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t("Basic Information")}</CardTitle>
              <CardDescription>
                {t("Configure the basic settings for your journey")}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <FieldGroup>
              <Controller
                name="name"
                control={rootForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="chatbot-name">
                      {t("Journey Name")} <span aria-hidden="true">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        {...field}
                        id="chatbot-name"
                        placeholder={t("e.g. Welcome journey, Support journey...")}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>
                        {t("Give this journey a clear internal name.")}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </FieldContent>
                  </Field>
                )}
              />

              {/* FIX: Shortened label with tooltip for explanation */}
              {!metaPlatform && (
                <Field>
                  <FieldTitle className="items-center gap-1.5">
                    {t("WhatsApp Account")}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="cursor-help text-xs text-muted-foreground bg-muted rounded-full size-4 flex items-center justify-center font-medium" />
                        }
                      >
                        ?
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs text-xs">
                        {t(
                          "Only required if this journey includes a lead automation step that sends messages via a specific WhatsApp number.",
                        )}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-xs text-muted-foreground">({t("Optional")})</span>
                  </FieldTitle>
                  <FieldContent>
                    <Controller
                      name="whatsappSettingsPhoneId"
                      control={rootForm.control}
                      render={({ field }) => (
                        <AccountSelector
                          optional={true}
                          value={field.value ?? undefined}
                          onChange={(value) => field.onChange(value ?? "")}
                        />
                      )}
                    />
                    <FieldDescription>
                      {t(
                        "Link a specific phone number only when your flow sends outgoing WhatsApp messages.",
                      )}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        {/* FIX: Clear visual separation between form and actions */}
        <div className="flex justify-between items-center pt-2">
          {/* Left: Cancel only */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelClick}
            className="text-muted-foreground hover:text-foreground"
          >
            {t("Cancel")}
          </Button>

          {/* Right: Save with proper spinner */}
          <Button type="submit" loading={isSaving} className="min-w-30">
            {!isSaving && saveSuccess && <IconCheck size={16} className="mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
