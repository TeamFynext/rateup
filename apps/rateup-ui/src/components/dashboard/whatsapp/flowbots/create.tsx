import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCheck,
  IconLayoutGrid,
  IconLoader2,
  IconSearch,
  IconTemplate,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { automationKeys } from "@/backend/whatsapp/automation.keys";
import {
  useCreateInstagramAutomationMutation,
  useUpdateInstagramAutomationMutation,
} from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import { AutomationPlatform } from "@/types/platform.ts";

import { DEMO_TEMPLATES } from "./demoTemplates.ts";

// ─── Template Picker Dialog ────────────────────────────────────────────────────

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: (typeof DEMO_TEMPLATES)[0]) => void;
  platform?: AutomationPlatform;
}

function TemplatePicker({ open, onClose, onSelect, platform }: Readonly<TemplatePickerProps>) {
  // FIX: search state persists across dialog open/close via useRef-backed state
  const searchRef = useRef("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { t } = useTranslation();
  useEffect(() => {
    if (open) {
      setSearch(searchRef.current);
    } else {
      setSelected(null);
    }
  }, [open]);
  function handleSearchChange(value: string) {
    searchRef.current = value;
    setSearch(value);
  }

  const filtered = DEMO_TEMPLATES.filter((template) => {
    return (
      (!platform || template.platform === platform) &&
      (template.name.toLowerCase().includes(search.toLowerCase()) ||
        template.description.toLowerCase().includes(search.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())))
    );
  });

  function handleApply() {
    const tpl = DEMO_TEMPLATES.find((template) => template.id === selected);
    if (tpl) {
      onSelect(tpl);
      onClose();
      // Don't reset selected so user can re-open and see their last pick
    }
  }

  const selectedTemplate = DEMO_TEMPLATES.find((template) => template.id === selected);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconTemplate size={20} className="text-primary" />
            {t("Choose a Template")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Pick a pre-built chatbot template to get started quickly.")}
          </p>
          <div className="relative mt-3">
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder={t("Search by name, tag, or description...")}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
              <IconTemplate size={32} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{t("No templates found")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("Try a different search term")}
              </p>
            </div>
          )}
          {filtered.map((tpl) => {
            const isSelected = selected === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelected(isSelected ? null : tpl.id)}
                className={`text-left rounded-xl border p-4 transition-all duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>

                    {/* FIX: Larger, readable badges + node count info */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {tpl.platform === AutomationPlatform.WHATSAPP ? (
                          <span className="flex items-center gap-1">
                            <IconBrandWhatsapp size={11} /> {t("WhatsApp")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <IconBrandInstagram size={11} /> {t("Instagram")}
                          </span>
                        )}
                      </Badge>
                      {tpl.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {/* FIX: Node count shown as preview hint */}
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-0.5 text-muted-foreground"
                      >
                        <IconLayoutGrid size={10} className="mr-1" />
                        {t("{count} nodes", { count: tpl.nodeCount })}
                      </Badge>
                    </div>
                  </div>

                  {/* FIX: Clear selected indicator */}
                  <div
                    className={`shrink-0 mt-0.5 rounded-full p-0.5 transition-all duration-150 ${
                      isSelected
                        ? "bg-primary text-primary-foreground scale-100 opacity-100"
                        : "bg-muted text-muted-foreground scale-75 opacity-30"
                    }`}
                  >
                    <IconCheck size={12} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* FIX: Footer shows selected template name for confirmation */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-2 bg-muted/20">
          <div className="text-sm text-muted-foreground truncate">
            {selectedTemplate ? (
              <span>
                {t("Selected:")}{" "}
                <span className="font-medium text-foreground">{selectedTemplate.name}</span>
              </span>
            ) : (
              <span>{t("No template selected")}</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="button" size="sm" disabled={!selected} onClick={handleApply}>
              {t("Use Template")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  initialValues?: WaAutomatedReply,
  forcedPlatform?: AutomationPlatform,
): AutomatedReplyFormValues {
  if (initialValues) {
    return {
      ...initialValues,
      platform: forcedPlatform ?? initialValues.platform ?? AutomationPlatform.WHATSAPP,
    };
  }

  return {
    name: "",
    platform: forcedPlatform ?? AutomationPlatform.WHATSAPP,
    matchData: {
      json: {
        nodes: [
          {
            id: `startNode-${Date.now()}`,
            type: "startNode",
            position: { x: 225, y: 45 },
            data: { label: "Start", type: "startNode", startMessage: "" },
            measured: { width: 220, height: 126 },
          },
        ],
        edges: [],
        viewport: {},
      },
      caseSensitive: false,
    },
    whatsappSettingsPhoneId: null,
  };
}

// ─── Form ──────────────────────────────────────────────────────────────────────

interface AutoPilotFormProps {
  initialValues?: WaAutomatedReply;
  editMode?: boolean;
  close?: () => void;
  platform?: AutomationPlatform;
}

export function AutomatedReplyForm({
  initialValues,
  editMode,
  close,
  platform = AutomationPlatform.WHATSAPP,
}: Readonly<AutoPilotFormProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // FIX: Added validation rules
  const formSchema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("Chatbot name is required"))
      .min(3, t("Name must be at least 3 characters")),
  });

  const rootForm = useForm<AutomatedReplyFormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<AutomatedReplyFormValues>,
    defaultValues: getInitialValues(initialValues, platform),
  });

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
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

  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation();
  const createInstagramMutation = useCreateInstagramAutomationMutation();
  const updateInstagramMutation = useUpdateInstagramAutomationMutation();

  const platformValue = rootForm.watch("platform");
  const isInstagram = platformValue === AutomationPlatform.INSTAGRAM;
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

    if (editMode) {
      if (isInstagram) {
        updateInstagramMutation.mutate(
          { ...data, id: data.id ?? waAutomatedReplyId ?? "" },
          {
            onSuccess: () => {
              qc.invalidateQueries({
                queryKey: automationKeys.instagramAutomation({ automationId: waAutomatedReplyId }),
              });
              toast.success(t("Instagram Automation updated successfully"));
              setSaveSuccess(true);
            },
          },
        );
      } else {
        updateMutation.mutate(
          { ...data, id: data.id ?? waAutomatedReplyId ?? "" },
          {
            onSuccess: () => {
              qc.invalidateQueries({
                queryKey: automationKeys.waAutomatedReply({ waAutomatedReplyId }),
              });
              toast.success(t("Automated Reply updated successfully"));
              setSaveSuccess(true);
            },
          },
        );
      }
      return;
    }

    if (isInstagram) {
      createInstagramMutation.mutate(data, {
        onSuccess: (response) => {
          toast.success(t("Instagram automation created!"));
          setSaveSuccess(true);
          if (response?.data?.id) {
            navigate({
              to: `/dashboard/instagram/flowbots/${response.data.id}`,
            });
          }
        },
        onSettled: () => {
          rootForm.reset();
          close?.();
        },
      });
      return;
    }

    createMutation.mutate(data, {
      onSuccess: (response) => {
        setSaveSuccess(true);
        if (response?.id) {
          navigate({
            to: `/dashboard/whatsapp/flowbots/${response.id}`,
          });
        }
      },
      onSettled: () => {
        rootForm.reset();
        close?.();
      },
    });
  }

  function handleTemplateSelect(template: (typeof DEMO_TEMPLATES)[0]) {
    rootForm.reset({
      name: template.name,
      platform: platform ?? template.platform,
      matchData: template.matchData,
      whatsappSettingsPhoneId: null,
    });
    toast.success(t("Template {templateName} applied!", { templateName: template.name }));
  }

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    createInstagramMutation.isPending ||
    updateInstagramMutation.isPending;

  let submitLabel = t("Create Chatbot");
  if (isSaving) {
    submitLabel = t("Creating…");
  } else if (saveSuccess && editMode) {
    submitLabel = t("Chatbot created!");
  }

  return (
    <TooltipProvider>
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
        platform={platform}
      />
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
                {t("Configure the basic settings for your Chatbot")}
              </CardDescription>
            </div>
            {!editMode && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setTemplatePickerOpen(true)}
              >
                <IconTemplate size={16} />
                {t("Use Template")}
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-5">
            <FieldGroup>
              <Controller
                name="name"
                control={rootForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="chatbot-name">
                      {t("Chatbot Name")} <span aria-hidden="true">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        {...field}
                        id="chatbot-name"
                        placeholder={t("e.g. Welcome Bot, Support Bot...")}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>
                        {t("Give this bot a clear internal name.")}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </FieldContent>
                  </Field>
                )}
              />

              {/* FIX: Shortened label with tooltip for explanation */}
              {!isInstagram && (
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
                          "Only required if this chatbot includes a lead automation step that sends messages via a specific WhatsApp number.",
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
          <Button type="submit" disabled={isSaving} className="min-w-30">
            {isSaving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isSaving && saveSuccess && editMode && <IconCheck size={16} className="mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
