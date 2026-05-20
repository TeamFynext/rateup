"use client";

import { useEffect, useRef, useState } from "react";

import { useForm } from "@mantine/form";
import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCheck,
  IconLayoutGrid,
  IconSearch,
  IconTemplate,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform } from "@/types/platform.ts";
import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import {
  useCreateInstagramAutomationMutation,
  useUpdateInstagramAutomationMutation,
} from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput.tsx";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import { DEMO_TEMPLATES } from "./demoTemplates.ts";

// ─── Template Picker Dialog ────────────────────────────────────────────────────

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: (typeof DEMO_TEMPLATES)[0]) => void;
}

function TemplatePicker({
  open,
  onClose,
  onSelect,
}: Readonly<TemplatePickerProps>) {
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

  const filtered = DEMO_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
  );

  function handleApply() {
    const tpl = DEMO_TEMPLATES.find((t) => t.id === selected);
    if (tpl) {
      onSelect(tpl);
      onClose();
      // Don't reset selected so user can re-open and see their last pick
    }
  }

  const selectedTemplate = DEMO_TEMPLATES.find((t) => t.id === selected);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
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
              <IconTemplate
                size={32}
                className="text-muted-foreground/40 mb-3"
              />
              <p className="text-sm font-medium text-muted-foreground">
                {t("No templates found")}
              </p>
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
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
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
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs px-2 py-0.5"
                        >
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
                <span className="font-medium text-foreground">
                  {selectedTemplate.name}
                </span>
              </span>
            ) : (
              <span>{t("No template selected")}</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selected}
              onClick={handleApply}
            >
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

function ConfirmDiscardDialog({
  open,
  onConfirm,
  onCancel,
}: Readonly<ConfirmDiscardProps>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Discard Changes?")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t(
            "You have unsaved changes. Are you sure you want to discard them?",
          )}
        </p>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("Keep Editing")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
          >
            {t("Discard")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Platform Toggle ──────────────────────────────────────────────────────────

interface PlatformToggleProps {
  value: AutomationPlatform;
  onChange: (value: AutomationPlatform) => void;
}

// FIX: Replaced Select dropdown with a clear 2-option toggle for better UX
function PlatformToggle({ value, onChange }: Readonly<PlatformToggleProps>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("Platform")}</label>
      <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
        <button
          type="button"
          onClick={() => onChange(AutomationPlatform.WHATSAPP)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
            value === AutomationPlatform.WHATSAPP
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconBrandWhatsapp
            size={16}
            className={
              value === AutomationPlatform.WHATSAPP ? "text-green-500" : ""
            }
          />
          {t("WhatsApp")}
        </button>
        <button
          type="button"
          onClick={() => onChange(AutomationPlatform.INSTAGRAM)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
            value === AutomationPlatform.INSTAGRAM
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconBrandInstagram
            size={16}
            className={
              value === AutomationPlatform.INSTAGRAM ? "text-pink-500" : ""
            }
          />
          {t("Instagram")}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateAutomatedReplyPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("Create Chatbot")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "Set up automated replies for your WhatsApp or Instagram conversations.",
          )}
        </p>
      </div>
      <AutomatedReplyForm />
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitialValues(initialValues?: WaAutomatedReply) {
  if (initialValues) return initialValues;
  return {
    name: "",
    platform: AutomationPlatform.WHATSAPP,
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
}

export function AutomatedReplyForm({
  initialValues,
  editMode,
  close,
}: Readonly<AutoPilotFormProps>) {
  const { t } = useTranslation();

  // FIX: Added validation rules
  const rootForm = useForm({
    initialValues: getInitialValues(initialValues),
    validate: {
      name: (value) =>
        !value?.trim()
          ? t("Chatbot name is required")
          : value.trim().length < 3
            ? t("Name must be at least 3 characters")
            : null,
    },
  });

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  // FIX: Track save success to show inline confirmation
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    rootForm.setInitialValues(getInitialValues(initialValues));
  }, [initialValues]);

  const qc = useQueryClient();
  const searchParams = useSearch({ strict: false });
  const waAutomatedReplyId = searchParams.waAutomatedReplyId;

  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation();
  const createInstagramMutation = useCreateInstagramAutomationMutation();
  const updateInstagramMutation = useUpdateInstagramAutomationMutation();

  const isInstagram = rootForm.values.platform === AutomationPlatform.INSTAGRAM;
  const isDirty = rootForm.isDirty();

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
    const data = rootForm.values;

    if (editMode) {
      if (isInstagram) {
        updateInstagramMutation.mutate(data, {
          onSuccess: () => {
            qc.invalidateQueries({
              queryKey: [
                "instagramAutomation",
                { automationId: waAutomatedReplyId },
              ],
            });
            toast.success(t("Instagram Automation updated successfully"));
            setSaveSuccess(true);
          },
        });
      } else {
        updateMutation.mutate(data, {
          onSuccess: () => {
            qc.invalidateQueries({
              queryKey: ["waAutomatedReply", { waAutomatedReplyId }],
            });
            toast.success(t("Automated Reply updated successfully"));
            setSaveSuccess(true);
          },
        });
      }
    } else {
      if (isInstagram) {
        createInstagramMutation.mutate(data, {
          onSuccess: () => {
            toast.success(t("Instagram automation created!"));
            setSaveSuccess(true);
          },
          onSettled: () => {
            rootForm.reset();
            close?.();
          },
        });
      } else {
        createMutation.mutate(data, {
          onSuccess: () => {
            toast.success(t("Chatbot created successfully!"));
            setSaveSuccess(true);
          },
          onSettled: () => {
            rootForm.reset();
            close?.();
          },
        });
      }
    }
  }

  function handleTemplateSelect(template: (typeof DEMO_TEMPLATES)[0]) {
    rootForm.setValues({
      name: template.name,
      platform: template.platform,
      matchData: template.matchData,
      whatsappSettingsPhoneId: null,
    });
    rootForm.resetDirty();
    toast.success(
      t("Template {templateName} applied!", { templateName: template.name }),
    );
  }

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    createInstagramMutation.isPending ||
    updateInstagramMutation.isPending;

  return (
    <TooltipProvider>
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
      />
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      <form
        onSubmit={rootForm.onSubmit(handleSubmitClick)}
        className="space-y-6"
        noValidate
      >
        <Card>
          {/* FIX: Template button moved into CardHeader as a secondary action */}
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t("Basic Information")}</CardTitle>
              <CardDescription>
                {t("Configure the basic settings for your Chatbot")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTemplatePickerOpen(true)}
              className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
            >
              <IconTemplate size={16} />
              {t("Use Template")}
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* FIX: Validation error shown below name field */}
            <ContainedTextField
              label={t("Chatbot Name")}
              placeholder={t("e.g. Welcome Bot, Support Bot...")}
              required
              {...rootForm.getInputProps("name")}
              error={rootForm.errors.name}
            />

            {/* FIX: Platform toggle instead of dropdown */}
            <PlatformToggle
              value={rootForm.values.platform as AutomationPlatform}
              onChange={(value) => rootForm.setFieldValue("platform", value)}
            />

            {/* FIX: Shortened label with tooltip for explanation */}
            {!isInstagram && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium">
                    {t("WhatsApp Account")}
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-xs text-muted-foreground bg-muted rounded-full w-4 h-4 flex items-center justify-center font-medium">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      {t(
                        "Only required if this chatbot includes a lead automation step that sends messages via a specific WhatsApp number.",
                      )}
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-xs text-muted-foreground">
                    ({t("Optional")})
                  </span>
                </div>
                <AccountSelector
                  optional={true}
                  {...rootForm.getInputProps("whatsappSettingsPhoneId")}
                />
              </div>
            )}
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
          <Button type="submit" disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Saving…")}
              </>
            ) : saveSuccess && editMode ? (
              <>
                <IconCheck size={16} className="mr-2" />
                {t("Saved")}
              </>
            ) : (
              t("Save Chatbot")
            )}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
