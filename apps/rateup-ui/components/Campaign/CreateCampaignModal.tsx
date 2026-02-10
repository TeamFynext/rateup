"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  IconCheck,
  IconClock,
  IconInfoCircle,
  IconPlus,
  IconRocket,
  IconTrash,
  IconWand,
} from "@tabler/icons-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CampaignType } from "@/types/enums";
import useTemplatesAvailableForTeam from "@/hooks/team";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "@/backend/campaign/campaign.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { SAVE_HOTKEY } from "@/utils/constants";

import { AccountSelector } from "../input/AccountSelector";
import { TeamSelector } from "../input/TeamSelector";

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
  teamId: z.string().min(1, { message: "Must select a team" }),
  name: z.string().trim().min(1, { message: "Name cannot be empty" }),
  waTemplateId: z.string().optional(),
  type: z.nativeEnum(CampaignType),
  surveyTeamMapId: z.string().optional(),
  flowId: z.string().optional(),
  dynamicTags: z.array(z.string()).optional(),
  useUserConsent: z.boolean(),
  whatsappSettingsPhoneId: z
    .string()
    .min(1, { message: "Must select a phone number" }),
});

type FormValues = z.infer<typeof formSchema>;

const CreateCampaignModal = ({
  close,
  isEdit,
  campaign,
  dynamicVariables = [],
  campaignType = CampaignType.WHATSAPP,
}: CreateCampaignProps) => {
  const [activeTab, setActiveTab] = useState<"basic" | "templates">("basic");
  const t = useTranslations("campaign.create");
  const { customFields } = useCustomFieldsContext();
  const submitRef = useRef<() => void>(() => {});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // ✅ ADD THIS
    reValidateMode: "onChange", // ✅ (important)
    defaultValues: {
      name: campaign?.name || "",
      type: campaignType,
      teamId: campaign?.teamId || "",
      surveyTeamMapId: campaign?.surveyTeamMapId || "",
      waTemplateId: campaign?.waTemplateId || "",
      flowId: campaign?.flowId || "",
      dynamicTags: campaign?.dynamicTags || [],
      useUserConsent: campaign?.useUserConsent ?? true,
      whatsappSettingsPhoneId: campaign?.whatsappSettingsPhoneId || "",
    },
  });
  const [dripStages, setDripStages] = useState<DripStage[]>([
    {
      id: undefined,
      templateId: "",
      delay: 1,
      delayUnit: "days",
      sendAtTime: "09:00",
    },
  ]);
  const BASIC_FIELDS: (keyof FormValues)[] = [
    "teamId",
    "name",
    "whatsappSettingsPhoneId",
  ];

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
        whatsappSettingsPhoneId: campaign?.whatsappSettingsPhoneId || "",
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

  useEffect(() => {
    if (form.watch("type") !== CampaignType.DRIP) {
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
  }, [form.watch("type")]);

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
    (
      idx: number,
      field: "templateId" | "delay" | "delayUnit" | "sendAtTime",
      value: any,
    ) => {
      setDripStages((prev) =>
        prev.map((stage, i) =>
          i === idx ? { ...stage, [field]: value } : stage,
        ),
      );
    },
    [],
  );

  const templates = useTemplatesAvailableForTeam(form.watch("teamId"));
  const templatesData = useMemo(() => {
    return (
      templates
        ?.filter(
          (t) => t?.data?.status === "APPROVED", // ✅ Meta approved only
        )
        .map((t) => ({
          value: t.id,
          label: t.data?.name,
        })) || []
    );
  }, [templates]);
  const selectedTemplate = useMemo(() => {
    if (!form.watch("waTemplateId")) return null;
    return templates?.find((t) => t.id === form.watch("waTemplateId"));
  }, [templates, form.watch("waTemplateId")]);
  const extractedDynamicVariables = useMemo(() => {
    if (!selectedTemplate) return [];

    const bodyText =
      selectedTemplate.data?.components?.find((c: any) => c.type === "BODY")
        ?.text ?? "";

    const matches = bodyText.match(/{{\d+}}/g) || [];

    return Array.from(new Set(matches)); // ["{{1}}", "{{2}}"]
  }, [selectedTemplate]);
  const lastTemplateRef = useRef<string | null>(null);

  useEffect(() => {
    const templateId = form.getValues("waTemplateId");

    if (!templateId || templateId === lastTemplateRef.current) return;

    lastTemplateRef.current = templateId;

    if (extractedDynamicVariables.length > 0) {
      form.setValue(
        "dynamicTags",
        Array(extractedDynamicVariables.length).fill(""),
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );
    } else {
      form.setValue("dynamicTags", []);
    }
  }, [form.watch("waTemplateId")]);

  const createCampaignMutation = useCreateCampaignMutation(
    form.watch("teamId"),
    campaignType,
  );
  const updateCampaignMutation = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
    () => {},
    campaignType,
  );

  const isFormValid = useMemo(() => {
    const { errors } = form.formState;

    if (form.watch("type") === CampaignType.DRIP) {
      const hasInvalidStages = dripStages.some((stage) => !stage.templateId);
      const hasOtherErrors = Object.keys(errors).some(
        (key) => key !== "waTemplateId" && key !== "dynamicTags",
      );
      return !hasInvalidStages && !hasOtherErrors;
    }

    const hasNonTemplateErrors = Object.keys(errors).some(
      (key) => key !== "waTemplateId" && key !== "dynamicTags",
    );
    const hasTemplate = !!form.watch("waTemplateId");
    const dynamicTags = form.watch("dynamicTags") || [];

    // Check if all required dynamic tags are filled
    const allDynamicTagsFilled =
      extractedDynamicVariables.length === 0 ||
      (dynamicTags.length === extractedDynamicVariables.length &&
        dynamicTags.every((tag) => tag && tag.trim() !== ""));

    return !hasNonTemplateErrors && hasTemplate && allDynamicTagsFilled;
  }, [
    form.formState.errors,
    form.watch("type"),
    form.watch("waTemplateId"),
    form.watch("dynamicTags"),
    dripStages,
    extractedDynamicVariables,
  ]);

  const handleNext = async () => {
    const fieldsToValidate = isEdit
      ? ["name", "whatsappSettingsPhoneId"]
      : ["teamId", "name", "whatsappSettingsPhoneId"];

    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      setActiveTab("templates");
    }
  };

  const handleSubmit = useCallback(
    (values: FormValues) => {
      if (values.type === CampaignType.DRIP) {
        const invalidStageIndex = dripStages.findIndex(
          (stage) => !stage.templateId,
        );

        if (invalidStageIndex !== -1) {
          toast.error(
            t("validation.dripStageRequired", { stage: invalidStageIndex + 1 }),
          );
          return;
        }
      }

      if (values.type !== CampaignType.DRIP) {
        const flowId =
          templates
            ?.find((t) => t?.id === values?.waTemplateId)
            ?.data?.components?.find((c: any) => c?.buttons)
            ?.buttons?.find((b: any) => b?.type === "FLOW")?.flow_id ??
          undefined;

        if (flowId) {
          values.flowId = flowId; // only set if it actually has a value
        }
      }

      const submitData: any = { ...values };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? t("header.edit") : t("header.create")}
            <Badge variant="secondary" className="gap-1">
              {form.watch("type") === CampaignType.DRIP ? (
                <IconWand className="h-3 w-3" />
              ) : (
                <IconRocket className="h-3 w-3" />
              )}
              {form.watch("type") === CampaignType.DRIP
                ? t("badge.drip")
                : t("badge.whatsapp")}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("description.edit") : t("description.create")}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="templates">{t("tabs.templates")}</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form
              id="create-campaign-form"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {!isEdit && (
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("fields.team")}</FormLabel>
                          <FormControl>
                            <TeamSelector {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("fields.name")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("placeholders.name")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsappSettingsPhoneId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("fields.phone")}</FormLabel>
                        <FormControl>
                          <AccountSelector {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <CardContent className="pt-4">
                      <FormField
                        control={form.control}
                        name="useUserConsent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between space-y-0">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <IconCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <FormLabel className="font-medium">
                                  {t("consent.label")}
                                </FormLabel>
                              </div>
                              <FormDescription className="text-xs">
                                {field.value
                                  ? t("consent.descriptionEnabled")
                                  : t("consent.descriptionDisabled")}
                              </FormDescription>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                {t("consent.recommended")}
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {campaignType === CampaignType.DRIP && (
                    <Alert>
                      <IconInfoCircle className="h-4 w-4" />
                      <AlertDescription>{t("alert.dripInfo")}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="templates" className="mt-4">
                {form.watch("type") === CampaignType.DRIP ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t("drip.header", { count: dripStages.length })}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDripStage}
                      >
                        <IconPlus className="mr-2 h-4 w-4" />
                        {t("drip.addStage")}
                      </Button>
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
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
                                    {t("drip.stage", { number: idx + 1 })}
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
                                  stage.delayUnit === "minutes" ||
                                  stage.delayUnit === "hours"
                                    ? "grid-cols-3"
                                    : "grid-cols-2"
                                }`}
                              >
                                <div className="space-y-2 col-span-full">
                                  <Label className="text-xs">
                                    {t("fields.template")}
                                  </Label>
                                  <Select
                                    value={stage.templateId}
                                    onValueChange={(val) =>
                                      updateDripStage(idx, "templateId", val)
                                    }
                                    disabled={templatesData.length === 0}
                                  >
                                    <SelectTrigger
                                      className={`h-9 ${!stage.templateId ? "border-destructive" : ""}`}
                                    >
                                      <SelectValue
                                        placeholder={
                                          templatesData.length === 0
                                            ? t("placeholders.noTemplates")
                                            : t("placeholders.selectTemplate")
                                        }
                                      />
                                    </SelectTrigger>

                                    <SelectContent>
                                      {templatesData.map((template) => (
                                        <SelectItem
                                          key={template.value}
                                          value={template.value}
                                        >
                                          {template.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {!stage.templateId && (
                                    <p className="text-xs text-destructive">
                                      {t("validation.templateRequired")}
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">
                                    {t("fields.delay")}
                                  </Label>
                                  <div className="relative">
                                    <IconClock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      value={stage.delay}
                                      onChange={(e) =>
                                        updateDripStage(
                                          idx,
                                          "delay",
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                      className="h-9 pl-8"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">
                                    {t("fields.unit")}
                                  </Label>
                                  <Select
                                    value={stage.delayUnit}
                                    onValueChange={(val) =>
                                      updateDripStage(idx, "delayUnit", val)
                                    }
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="minutes">
                                        {t("units.minutes")}
                                      </SelectItem>
                                      <SelectItem value="hours">
                                        {t("units.hours")}
                                      </SelectItem>
                                      <SelectItem value="days">
                                        {t("units.days")}
                                      </SelectItem>
                                      <SelectItem value="weeks">
                                        {t("units.weeks")}
                                      </SelectItem>
                                      <SelectItem value="months">
                                        {t("units.months")}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(stage.delayUnit === "days" ||
                                  stage.delayUnit === "weeks" ||
                                  stage.delayUnit === "months") && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      {t("fields.sendAtTime")}
                                    </Label>
                                    <div className="relative">
                                      <IconClock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                      <Input
                                        type="time"
                                        value={stage.sendAtTime}
                                        onChange={(e) =>
                                          updateDripStage(
                                            idx,
                                            "sendAtTime",
                                            e.target.value,
                                          )
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
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("broadcast.description")}
                    </p>

                    <FormField
                      control={form.control}
                      name="waTemplateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("fields.template")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={templatesData.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    templatesData.length === 0
                                      ? t("placeholders.noTemplates")
                                      : t("placeholders.selectTemplate")
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templatesData.map((template) => (
                                <SelectItem
                                  key={template.value}
                                  value={template.value}
                                >
                                  {template.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {extractedDynamicVariables.length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium">
                            {t("dynamicVariables.title")}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {t("dynamicVariables.description")}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {extractedDynamicVariables.map((_, i) => (
                            <FormField
                              key={i}
                              control={form.control}
                              name={`dynamicTags.${i}`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    {t("dynamicVariables.variable", {
                                      num: i + 1,
                                    })}
                                  </FormLabel>
                                  <Select
                                    onValueChange={(val) => {
                                      field.onChange(val);
                                      // Trigger validation on all fields to update isFormValid
                                      setTimeout(() => {
                                        form.trigger();
                                      }, 0);
                                    }}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-9">
                                        <SelectValue
                                          placeholder={t(
                                            "placeholders.selectTag",
                                          )}
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="name">
                                        {t("dynamicVariables.name")}
                                      </SelectItem>
                                      {customFields?.map((customField) => (
                                        <SelectItem
                                          key={customField.slug}
                                          value={customField.slug}
                                        >
                                          {customField.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </form>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={close}>
                {t("actions.cancel")}
              </Button>

              {activeTab === "basic" ? (
                <Button
                  type="button" // ✅ MUST be button
                  onClick={handleNext} // ✅ NO submit
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
                >
                  {t("actions.next")}
                </Button>
              ) : (
                <Button
                  type="submit" // ✅ ONLY submit button
                  form="create-campaign-form"
                  disabled={
                    isEdit
                      ? updateCampaignMutation.isPending
                      : !isFormValid || createCampaignMutation.isPending
                  }
                  className="bg-[#2E5BFF] hover:bg-[#2E5BFF]/90"
                >
                  {isEdit
                    ? updateCampaignMutation.isPending
                      ? t("actions.updating")
                      : t("actions.update")
                    : createCampaignMutation.isPending
                      ? t("actions.creating")
                      : t("actions.create")}
                </Button>
              )}
            </DialogFooter>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignModal;
