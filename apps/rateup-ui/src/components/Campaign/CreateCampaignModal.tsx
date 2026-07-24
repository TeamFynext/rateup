import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCheck,
  IconClock,
  IconInfoCircle,
  IconPlus,
  IconRocket,
  IconTrash,
  IconWand,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useId, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "@/backend/campaign/campaign.query";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import { CampaignType } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";

import { TeamSelector } from "../input/TeamSelector.tsx";

interface CreateCampaignProps {
  close: () => void;
  isEdit?: boolean;
  campaign?: any;
  dynamicVariables?: string[];
  campaignType: CampaignType;
}

interface DripStage {
  id?: string;
  templateId: string;
  delay: number;
  delayUnit: string;
  sendAtTime: string;
}

const formSchema = z.object({
  teamId: z.string().min(1, {
    error: "Must select a team",
  }),
  name: z.string().trim().min(1, {
    error: "Name cannot be empty",
  }),
  waTemplateId: z.string().optional(),
  type: z.enum(CampaignType),
  surveyTeamMapId: z.string().optional(),
  flowId: z.string().optional(),
  dynamicTags: z.array(z.string()).optional(),
  useUserConsent: z.boolean(),
  // Empty string means "no cap"; coerced to null on submit.
  dailySendLimit: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) > 0), {
      error: "Daily send limit must be a whole number of at least 1",
    }),
});

type FormValues = z.infer<typeof formSchema>;

const CreateCampaignModal = ({
  close,
  isEdit,
  campaign,
  campaignType = CampaignType.WHATSAPP,
}: CreateCampaignProps) => {
  const uid = useId();
  const [activeTab, setActiveTab] = useState<"basic" | "templates">("basic");
  const { t } = useTranslation("campaign.create");
  const { customFields } = useCustomFieldsContext();
  const navigate = useNavigate();
  const submitRef = useRef<() => void>(() => {});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: campaign?.name || "",
      type: campaignType,
      teamId: campaign?.teamId || "",
      surveyTeamMapId: campaign?.surveyTeamMapId || "",
      waTemplateId: campaign?.waTemplateId || "",
      flowId: campaign?.flowId || "",
      dynamicTags: campaign?.dynamicTags || [],
      useUserConsent: campaign?.useUserConsent ?? true,
      dailySendLimit: campaign?.dailySendLimit ? String(campaign.dailySendLimit) : "",
    },
  });

  const teamId = campaign?.teamId || form.watch("teamId");
  const watchedType = form.watch("type");
  const watchedTemplate = form.watch("waTemplateId");
  const watchedDynamicTags = form.watch("dynamicTags");
  const templates = useTemplatesAvailableForTeam(teamId);

  const [dripStages, setDripStages] = useState<DripStage[]>([
    {
      id: undefined,
      templateId: "",
      delay: 1,
      delayUnit: "days",
      sendAtTime: "09:00",
    },
  ]);

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign?.name || "",
        type: campaignType,
        teamId: campaign?.teamId || "",
        surveyTeamMapId: campaign?.surveyTeamMapId || "",
        waTemplateId: campaign?.waTemplateId || "",
        flowId: campaign?.flowId || "",
        dynamicTags: campaign?.dynamicTags || [],
        useUserConsent: campaign?.useUserConsent ?? true,
        dailySendLimit: campaign?.dailySendLimit ? String(campaign.dailySendLimit) : "",
      });

      if (campaign?.dripStages && campaign.dripStages.length > 0) {
        setDripStages(
          campaign.dripStages.map((stage: any) => ({
            id: stage.id,
            templateId: stage.waTemplateId || "",
            delay: stage.delay || 1,
            delayUnit: stage.delayUnit || "days",
            sendAtTime: stage.sendAtTime || "09:00",
          })),
        );
      }
    }
  }, [campaign, campaignType, form]);
  const campaignTypeValue = watchedType;

  useEffect(() => {
    if (campaignTypeValue !== CampaignType.DRIP) {
      setDripStages([
        {
          id: undefined,
          templateId: "",
          delay: 1,
          delayUnit: "days",
          sendAtTime: "09:00",
        },
      ]);
    }
  }, [campaignTypeValue]);

  const addDripStage = useCallback(() => {
    setDripStages((prev) => [
      ...prev,
      {
        id: undefined,
        templateId: "",
        delay: 1,
        delayUnit: "days",
        sendAtTime: "09:00",
      },
    ]);
  }, []);

  const removeDripStage = useCallback((idx: number) => {
    setDripStages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateDripStage = useCallback(
    (idx: number, field: "templateId" | "delay" | "delayUnit" | "sendAtTime", value: any) => {
      setDripStages((prev) =>
        prev.map((stage, i) => (i === idx ? { ...stage, [field]: value } : stage)),
      );
    },
    [],
  );

  const templatesData = useMemo(() => {
    return (
      templates
        ?.filter((t) => t?.data?.status === "APPROVED")
        .map((t) => ({
          value: t.id,
          label: t.data?.name,
        })) || []
    );
  }, [templates]);

  const selectedTemplate = useMemo(() => {
    if (!watchedTemplate) return null;
    return templates?.find((t) => t.id === watchedTemplate);
  }, [templates, watchedTemplate]);

  const extractedDynamicVariables = useMemo(() => {
    if (!selectedTemplate) return [];

    const bodyText =
      selectedTemplate.data?.components?.find((c: any) => c.type === "BODY")?.text ?? "";

    const matches = bodyText.match(/{{\d+}}/g) || [];

    return Array.from(new Set(matches));
  }, [selectedTemplate]);

  const lastTemplateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!watchedTemplate || watchedTemplate === lastTemplateRef.current) return;

    lastTemplateRef.current = watchedTemplate;

    if (isEdit && campaign?.dynamicTags?.length) {
      return;
    }
    if (extractedDynamicVariables.length > 0) {
      form.setValue("dynamicTags", Array(extractedDynamicVariables.length).fill(""), {
        shouldDirty: false,
        shouldValidate: false,
      });
    } else {
      form.setValue("dynamicTags", []);
    }
  }, [watchedTemplate]);

  const createCampaignMutation = useCreateCampaignMutation(teamId, campaignType);
  const updateCampaignMutation = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
    () => {},
    campaignType,
  );

  const isFormValid = useMemo(() => {
    const { errors } = form.formState;

    if (watchedType === CampaignType.DRIP) {
      const hasInvalidStages = dripStages.some((stage) => !stage.templateId);
      const hasOtherErrors = Object.keys(errors).some(
        (key) => key !== "waTemplateId" && key !== "dynamicTags",
      );
      return !hasInvalidStages && !hasOtherErrors;
    }

    const hasNonTemplateErrors = Object.keys(errors).some(
      (key) => key !== "waTemplateId" && key !== "dynamicTags",
    );
    const hasTemplate = !!watchedTemplate;
    const dynamicTags = watchedDynamicTags || [];

    const allDynamicTagsFilled =
      extractedDynamicVariables.length === 0 ||
      (dynamicTags.length === extractedDynamicVariables.length &&
        dynamicTags.every((tag) => tag && tag.trim() !== ""));

    return !hasNonTemplateErrors && hasTemplate && allDynamicTagsFilled;
  }, [
    form.formState.errors,
    watchedType,
    watchedTemplate,
    watchedDynamicTags,
    dripStages,
    extractedDynamicVariables,
  ]);

  const handleNext = async () => {
    const fieldsToValidate = isEdit ? ["name"] : ["teamId", "name"];

    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      setActiveTab("templates");
    }
  };

  const handleSubmit = useCallback(
    (values: FormValues) => {
      if (values.type === CampaignType.DRIP) {
        const invalidStageIndex = dripStages.findIndex((stage) => !stage.templateId);

        if (invalidStageIndex !== -1) {
          toast.error(
            t("Please select a template for Drip Stage {stage}", {
              stage: (invalidStageIndex + 1).toString(),
            }),
          );
          return;
        }
      }

      if (values.type !== CampaignType.DRIP) {
        const flowId =
          templates
            ?.find((t) => t?.id === values?.waTemplateId)
            ?.data?.components?.find((c: any) => c?.buttons)
            ?.buttons?.find((b: any) => b?.type === "FLOW")?.flow_id ?? undefined;

        if (flowId) {
          values.flowId = flowId;
        }
      }

      const submitData: any = { ...values };

      // The API takes a positive int or null; the form holds it as a string.
      submitData.dailySendLimit = values.dailySendLimit ? Number(values.dailySendLimit) : null;

      if (values.type === CampaignType.DRIP) {
        submitData.dripStages = dripStages.map((stage) => {
          const processedStage: any = { ...stage };
          if (stage.delayUnit === "minutes") {
            delete processedStage.sendAtTime;
          }
          return processedStage;
        });
        delete submitData.waTemplateId;
      }

      if (isEdit) {
        updateCampaignMutation.mutate(
          { data: submitData, campaignId: campaign?.id },
          {
            onSuccess: () => {
              form.reset();
              close();
            },
          },
        );
      } else {
        createCampaignMutation.mutate(submitData, {
          onSuccess: () => {
            form.reset();
            close();
          },
        });
      }
    },
    [
      dripStages,
      templates,
      isEdit,
      updateCampaignMutation,
      createCampaignMutation,
      campaign?.id,
      form,
      close,
      t,
    ],
  );

  useEffect(() => {
    submitRef.current = form.handleSubmit(handleSubmit);
  }, [form, handleSubmit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === SAVE_HOTKEY.toLowerCase()
      ) {
        event.preventDefault();
        submitRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0">
        {/* Header - Fixed at top */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? t("Edit Campaign") : t("Create New Campaign")}
              <Badge variant="secondary" className="gap-1">
                {watchedType === CampaignType.DRIP ? (
                  <IconWand className="h-3 w-3" />
                ) : (
                  <IconRocket className="h-3 w-3" />
                )}
                {watchedType === CampaignType.DRIP ? t("Drip Campaign") : t("WhatsApp Campaign")}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? t("Update your campaign details")
                : t("Set up your campaign details and message")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Tab List */}
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t("Basic Info")}</TabsTrigger>
              <TabsTrigger value="templates">{t("Templates")}</TabsTrigger>
            </TabsList>
          </div>

          <form
            id="create-campaign-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <TabsContent value="basic" className="space-y-4 mt-4 m-0">
                <div className="space-y-4">
                  {!isEdit && (
                    <Controller
                      control={form.control}
                      name="teamId"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>{t("Team *")}</FieldLabel>
                          <TeamSelector {...field} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}

                  <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>{t("Campaign Name *")}</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder={t("e.g., Summer Sale 2025")}
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <CardContent className="pt-4">
                      <Controller
                        control={form.control}
                        name="useUserConsent"
                        render={({ field, fieldState }) => (
                          <Field
                            orientation="horizontal"
                            className="justify-between"
                            data-invalid={fieldState.invalid}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <IconCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <FieldLabel htmlFor={field.name} className="font-medium">
                                  {t("User Consent")}
                                </FieldLabel>
                              </div>
                              <FieldDescription className="text-xs">
                                {field.value
                                  ? t("Only send messages to contacts who have given consent")
                                  : t("Send messages to all contacts regardless of consent status")}
                              </FieldDescription>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                {t("Recommended: Keep enabled for compliance")}
                              </p>
                            </div>
                            <Switch
                              id={field.name}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </Field>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Controller
                    control={form.control}
                    name="dailySendLimit"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>{t("Daily Send Limit")}</FieldLabel>
                        <Input
                          id={field.name}
                          type="number"
                          min={1}
                          step={1}
                          placeholder={t("No limit")}
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        <FieldDescription className="text-xs">
                          {campaignType === CampaignType.DRIP
                            ? t(
                                "Max messages sent per day for each stage. Leave empty to send to everyone at once.",
                              )
                            : t(
                                "Max messages sent per day. Leave empty to send to everyone at once.",
                              )}
                        </FieldDescription>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  {campaignType === CampaignType.DRIP && (
                    <Alert>
                      <IconInfoCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t(
                          "Drip campaigns allow you to send a series of messages to contacts over time. Configure your message stages in the Templates tab.",
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="templates" className="mt-4 m-0">
                {watchedType === CampaignType.DRIP ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t("Configure your drip campaign stages ({count} stages)", {
                          count: dripStages.length?.toString(),
                        })}
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={addDripStage}>
                        <IconPlus className="mr-2 h-4 w-4" />
                        {t("Add Stage")}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {dripStages.map((stage, idx) => (
                        <Card key={idx} className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7 bg-violet-100 dark:bg-violet-900">
                                  <AvatarFallback className="text-xs text-violet-600 dark:text-violet-400">
                                    {idx + 1}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {t("Stage {number}", {
                                    number: (idx + 1).toString(),
                                  })}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeDripStage(idx)}
                                disabled={dripStages.length === 1}
                              >
                                <IconTrash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            <div
                              className={`grid gap-3 ${
                                stage.delayUnit === "minutes" || stage.delayUnit === "hours"
                                  ? "grid-cols-3"
                                  : "grid-cols-2"
                              }`}
                            >
                              <div className="space-y-2 col-span-full">
                                <FieldLabel htmlFor={`${uid}-label`} className="text-xs">
                                  {t("Choose Template *")}
                                </FieldLabel>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={stage.templateId}
                                    onValueChange={(val) => updateDripStage(idx, "templateId", val)}
                                    disabled={templatesData.length === 0}
                                    items={templatesData}
                                  >
                                    <SelectTrigger
                                      id={`${uid}-label`}
                                      className={`h-9 ${!stage.templateId ? "border-destructive" : ""}`}
                                    >
                                      <SelectValue
                                        placeholder={
                                          templatesData.length === 0
                                            ? t("No templates available")
                                            : t("Select template")
                                        }
                                      />
                                    </SelectTrigger>

                                    <SelectContent>
                                      {templatesData.map((template) => (
                                        <SelectItem key={template.value} value={template.value}>
                                          {template.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center gap-2">
                                    Or
                                    <Button
                                      onClick={() =>
                                        navigate({
                                          to: "/dashboard/whatsapp/templates/create",
                                        })
                                      }
                                    >
                                      Create Template
                                    </Button>
                                  </div>
                                </div>
                                {!stage.templateId && (
                                  <p className="text-xs text-destructive">
                                    {t("Template is required")}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <FieldTitle className="text-xs">{t("Delay")}</FieldTitle>
                                <div className="relative">
                                  <IconClock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={stage.delay}
                                    onChange={(e) =>
                                      updateDripStage(idx, "delay", parseInt(e.target.value) || 1)
                                    }
                                    className="h-9 pl-8"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <FieldLabel htmlFor={`${uid}-label-2`} className="text-xs">
                                  {t("Unit")}
                                </FieldLabel>
                                <Select
                                  value={stage.delayUnit}
                                  onValueChange={(val) => updateDripStage(idx, "delayUnit", val)}
                                  items={[
                                    { value: "minutes", label: t("Minutes") },
                                    { value: "hours", label: t("Hours") },
                                    { value: "days", label: t("Days") },
                                    { value: "weeks", label: t("Weeks") },
                                    { value: "months", label: t("Months") },
                                  ]}
                                >
                                  <SelectTrigger id={`${uid}-label-2`} className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes">{t("Minutes")}</SelectItem>
                                    <SelectItem value="hours">{t("Hours")}</SelectItem>
                                    <SelectItem value="days">{t("Days")}</SelectItem>
                                    <SelectItem value="weeks">{t("Weeks")}</SelectItem>
                                    <SelectItem value="months">{t("Months")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {(stage.delayUnit === "days" ||
                                stage.delayUnit === "weeks" ||
                                stage.delayUnit === "months") && (
                                <div className="space-y-2">
                                  <FieldTitle className="text-xs">{t("Send at time")}</FieldTitle>
                                  <div className="relative">
                                    <IconClock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      type="time"
                                      value={stage.sendAtTime}
                                      onChange={(e) =>
                                        updateDripStage(idx, "sendAtTime", e.target.value)
                                      }
                                      className="h-9 pl-8"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm py-2">{t("Choose an approved template or create one")}</p>

                    <Controller
                      control={form.control}
                      name="waTemplateId"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={templatesData.length === 0}
                              items={templatesData}
                            >
                              <SelectTrigger aria-invalid={fieldState.invalid}>
                                <SelectValue
                                  placeholder={
                                    templatesData.length === 0
                                      ? t("No templates available")
                                      : t("Select template")
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {templatesData.map((template) => (
                                  <SelectItem key={template.value} value={template.value}>
                                    {template.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              Or
                              <Button
                                onClick={() =>
                                  navigate({
                                    to: "/dashboard/whatsapp/templates/create",
                                  })
                                }
                              >
                                Create Template
                              </Button>
                            </div>
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    {extractedDynamicVariables.length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium">{t("Dynamic Variables")}</h4>
                          <p className="text-xs text-muted-foreground">
                            {t("Map dynamic content to your message variables")}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {extractedDynamicVariables.map((_, i) => (
                            <Controller
                              key={i}
                              control={form.control}
                              name={`dynamicTags.${i}`}
                              render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                  <FieldLabel htmlFor={field.name} className="text-xs">
                                    Variable {i + 1}
                                  </FieldLabel>
                                  <Select
                                    onValueChange={(val) => {
                                      field.onChange(val);
                                      setTimeout(() => {
                                        form.trigger();
                                      }, 0);
                                    }}
                                    value={field.value || ""}
                                    items={[
                                      { value: "name", label: t("Name") },
                                      ...(customFields?.map((customField) => ({
                                        value: customField.slug,
                                        label: customField.name,
                                      })) ?? []),
                                    ]}
                                  >
                                    <SelectTrigger
                                      className="h-9"
                                      aria-invalid={fieldState.invalid}
                                    >
                                      <SelectValue placeholder={t("Select dynamic tag")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="name">{t("Name")}</SelectItem>
                                      {customFields?.map((customField) => (
                                        <SelectItem key={customField.slug} value={customField.slug}>
                                          {customField.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>

            {/* Footer - Fixed at bottom */}
            <DialogFooter className="px-6 py-4 border-t bg-background">
              <Button type="button" variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>

              {activeTab === "basic" ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                >
                  {t("Next")}
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="create-campaign-form"
                  disabled={
                    isEdit
                      ? !isFormValid || updateCampaignMutation.isPending
                      : !isFormValid || createCampaignMutation.isPending
                  }
                >
                  {isEdit
                    ? updateCampaignMutation.isPending
                      ? t("Updating...")
                      : t("Update Campaign")
                    : createCampaignMutation.isPending
                      ? t("Creating...")
                      : t("Create Campaign")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignModal;
