"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";

import { TemplateType, WaAutomatedReplyResponseType } from "@/types/enums.ts";
import {
  useCreateLoyaltyTemplate,
  useDeleteLoyaltyTemplate,
  useGetAllLoyaltyTemplates,
  useUpdateLoyaltyTemplate,
} from "@/backend/loyalty/settings/settings.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";

import { AccountSelector } from "../input/AccountSelector.tsx";
import ConfirmationModal from "../Modal/ConfirmationModal.tsx";
import WaTextEditor from "../RichTextEditor/waTextEditor.tsx";
import { DataTable } from "../Table/data-table.tsx";

type LoyaltyTemplateConfig = {
  id?: string;
  type: string;
  requestMessage: string;
  responseType: string;
  waTemplateId?: string;
  content?: string | null;
  whatsappSettingsPhoneId?: string;
  [key: string]: any;
};

type LoyaltyTemplateFormValues = {
  type: LoyaltyTemplateTypes;
  waTemplateId: string;
  requestMessage: string;
  content: any;
  responseType: WaAutomatedReplyResponseType;
  whatsappSettingsPhoneId: string;
};

const LoyaltySettings = () => {
  const { data: templateConfigs, isPending } = useGetAllLoyaltyTemplates();
  const [opened, { open, close }] = useDisclosure(false);
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);

  const [selectedConfig, setSelectedConfig] =
    useState<LoyaltyTemplateConfig | null>(null);
  const { t: translations } = useTranslation();
  const columns = useLoyaltyTemplateColumns(
    setSelectedConfig,
    open,
    openDialog,
  );

  const deleteMutation = useDeleteLoyaltyTemplate();

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">
                Loyalty WhatsApp Command Configuration
              </CardTitle>
              <CardDescription>
                Create command-based replies with dynamic placeholders and
                preview output before publishing.
              </CardDescription>
            </div>
            <Button onClick={open} className="gap-2 self-start sm:self-auto">
              <IconPlus className="size-4" />
              {translations("New")}
            </Button>
          </div>
        </CardHeader>
      </Card>
      <DataTable
        columns={columns}
        data={templateConfigs || []}
        isPending={isPending}
      />
      <LoyaltyWaTemplateConfig
        config={selectedConfig}
        opened={opened}
        close={() => {
          setSelectedConfig(null);
          close();
        }}
      />
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel={translations(
          "Are you sure to delete this Command Configuration?",
        )}
        headerTitle={translations("Delete Command")}
        confirmLabel={translations("Delete")}
        onConfirm={() => {
          deleteMutation.mutate(selectedConfig?.id, {
            onSettled: () => {
              setSelectedConfig(null);
              closeDialog();
            },
          });
        }}
      />
    </div>
  );
};

export default LoyaltySettings;

enum LoyaltyTemplateTypes {
  CustomerRegistration = "CustomerRegistration",
  PointInformation = "PointInformation",
  Referral = "Referral",
  CustomerRemoval = "CustomerRemoval",
  RewardsIssued = "RewardsIssued",
}

const LoyaltyWaTemplateConfig = ({
  config,
  opened,
  close,
}: {
  config?: LoyaltyTemplateConfig | null;
  opened: boolean;
  close: () => void;
}) => {
  const templateMut = useCreateLoyaltyTemplate();
  const updateTempMut = useUpdateLoyaltyTemplate(config?.id);
  const { data: loyaltyTemplates } = useWaTemplates(TemplateType.LOYALTY);
  const { t: translations } = useTranslation();
  const getLoyaltyTemplateLabel = useLoyaltyTemplateLabel();
  const getLoyaltyTemplateVariableMeta = useLoyaltyTemplateVariableMeta();
  const getSampleReplyMessage = useSampleReplyMessage();

  const initialValues: LoyaltyTemplateFormValues = {
    type: LoyaltyTemplateTypes.PointInformation,
    waTemplateId: "",
    requestMessage: "",
    content: null,
    responseType: WaAutomatedReplyResponseType.Template,
    whatsappSettingsPhoneId: "",
  };

  const form = useForm<LoyaltyTemplateFormValues>({
    mode: "controlled",
    initialValues,
    validate: {
      requestMessage: isNotEmpty("required"),
      waTemplateId: (value, values) =>
        values.responseType === WaAutomatedReplyResponseType.Template &&
        !value?.length
          ? translations("whatsApp Template") + translations("required")
          : null,
      content: (value, values) =>
        values.responseType === WaAutomatedReplyResponseType.Text &&
        !getPlainTextFromRichContent(value).trim().length
          ? translations("content cannot be blank")
          : null,
      whatsappSettingsPhoneId: isNotEmpty("required"),
    },
  });

  const hanldeTemplateConfig = async () => {
    const validationRes = await form.validate();
    if (validationRes.hasErrors) return;
    const { type, ...rest } = form.values;
    if (config) {
      updateTempMut.mutate(rest, {
        onSettled: () => {
          form.reset();
          close();
        },
      });
      return;
    }
    templateMut.mutate(
      { type, ...rest },
      {
        onSettled: () => {
          form.reset();
          close();
        },
      },
    );
  };

  useEffect(() => {
    const nextValues = config
      ? { ...initialValues, ...sanitizeConfig(config) }
      : initialValues;

    form.setInitialValues(nextValues);
    form.setValues(nextValues);
  }, [config]);

  const typeData = Object.values(LoyaltyTemplateTypes).map((t) => ({
    value: t,
    label: getLoyaltyTemplateLabel(t).label,
  }));

  const variableMeta = getLoyaltyTemplateVariableMeta(form.values.type);
  const selectedTemplate = loyaltyTemplates?.find(
    (template) => template.id === form.values.waTemplateId,
  );
  const sampleReply = getSampleReplyMessage({
    responseType: form.values.responseType,
    content: getPlainTextFromRichContent(form.values.content),
    waTemplateId: form.values.waTemplateId,
    selectedTemplate,
    variableMeta,
  });
  const requestMessageError =
    typeof form.errors.requestMessage === "string"
      ? form.errors.requestMessage
      : "";
  const responseErrorCandidate =
    form.errors.waTemplateId || form.errors.content;
  const responseMessageError =
    typeof responseErrorCandidate === "string" ? responseErrorCandidate : "";
  const isSaving = templateMut.isPending || updateTempMut.isPending;

  return (
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset();
          close();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold sm:text-left">
            {translations("Loyalty WhatsApp Command Configuration")}
          </DialogTitle>
          <DialogDescription>
            {translations(
              "Configure command triggers, choose a response mode, and preview the final output before saving.",
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            hanldeTemplateConfig();
          }}
        >
          <div className="space-y-4">
            <Card className="gap-4 py-4">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{translations("Service Type")}</Label>
                  <Select
                    value={form.values.type}
                    onValueChange={(value) =>
                      form.setFieldValue("type", value as LoyaltyTemplateTypes)
                    }
                    disabled={!!config}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={translations("Select type")} />
                    </SelectTrigger>
                    <SelectContent>
                      {typeData.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <AccountSelector
                  {...form.getInputProps("whatsappSettingsPhoneId")}
                />

                <div className="space-y-2">
                  <Label htmlFor="loyalty-request-message">
                    {translations("Request Message")}
                  </Label>
                  <Input
                    id="loyalty-request-message"
                    placeholder={translations("Example: /points")}
                    value={form.values.requestMessage}
                    onChange={(event) =>
                      form.setFieldValue("requestMessage", event.target.value)
                    }
                  />
                  {requestMessageError && (
                    <p className="text-xs text-destructive">
                      {requestMessageError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{translations("Response Type")}</Label>
                  <RadioGroup
                    value={form.values.responseType}
                    onValueChange={(value) =>
                      form.setFieldValue(
                        "responseType",
                        value as WaAutomatedReplyResponseType,
                      )
                    }
                    className="grid grid-cols-2 gap-2"
                  >
                    <Label className="flex items-center gap-2 rounded-md border p-3 font-normal">
                      <RadioGroupItem
                        value={WaAutomatedReplyResponseType.Template}
                      />
                      {WaAutomatedReplyResponseType.Template}
                    </Label>
                    <Label className="flex items-center gap-2 rounded-md border p-3 font-normal">
                      <RadioGroupItem
                        value={WaAutomatedReplyResponseType.Text}
                      />
                      {WaAutomatedReplyResponseType.Text}
                    </Label>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="gap-4 py-4">
                <CardHeader>
                  <CardTitle className="text-base">
                    {translations("Response Message")}
                  </CardTitle>
                  <CardDescription>
                    {translations("Use placeholders like")}{" "}
                    <span className="font-medium">
                      &#123;&#123;1&#125;&#125;
                    </span>{" "}
                    {translations("for dynamic values")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {form.values.responseType ===
                  WaAutomatedReplyResponseType.Template ? (
                    <WaTemplateSelector
                      templateType={TemplateType.LOYALTY}
                      comboboxProps={{ withinPortal: false }}
                      label={
                        getLoyaltyTemplateLabel(form.values.type)?.templateLabel
                      }
                      description={
                        getLoyaltyTemplateLabel(form.values.type)
                          ?.templateDescription
                      }
                      value={form.values.waTemplateId}
                      onChange={(value) =>
                        form.setFieldValue("waTemplateId", value || "")
                      }
                    />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {translations("Reply Message")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {
                          getLoyaltyTemplateLabel(form.values.type)
                            .templateDescription
                        }
                      </p>
                      <WaTextEditor
                        handleInputChange={(value) => {
                          form.setFieldValue("content", value);
                        }}
                        content={form.values.content}
                      />
                    </div>
                  )}
                  {responseMessageError && (
                    <p className="text-xs text-destructive">
                      {responseMessageError}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="gap-4 py-4">
                <CardHeader>
                  <CardTitle className="text-base">
                    {translations("Live Preview")}
                  </CardTitle>
                  <CardDescription>
                    {translations(
                      "This is how the automation looks with sample data",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      WhatsApp
                    </p>
                    <div className="space-y-2">
                      <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {form.values.requestMessage || "/points"}
                      </div>
                      <div className="max-w-[85%] rounded-lg border bg-background px-3 py-2 text-sm">
                        {sampleReply}
                      </div>
                    </div>
                  </div>

                  {variableMeta.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {translations("Sample Variables")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variableMeta.map((variable) => (
                            <Badge key={variable.token} variant="outline">
                              {variable.token} ({variable.label}):{" "}
                              {variable.sample}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                close();
              }}
              disabled={isSaving}
            >
              {translations("Cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? `${translations("Save")}...` : translations("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

function useLoyaltyTemplateLabel() {
  const { t: translations } = useTranslation();

  return useCallback(
    (type: string) => {
      switch (type) {
        case LoyaltyTemplateTypes.CustomerRegistration:
          return {
            label: translations("Customer Registration"),
            templateLabel: translations(
              "WhatsApp Template for Successful Customer Registration",
            ),
            templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}`,
          };
        case LoyaltyTemplateTypes.PointInformation:
          return {
            label: translations("Point Information"),
            templateLabel: translations(
              "WhatsApp Template for Point Information",
            ),
            templateDescription: `Dynamic variables - {{1}} - ${translations("Current point balance")} , {{2}} - ${translations("Redeemed points")}, {{3}} - ${translations("Total earned points")}`,
          };
        case LoyaltyTemplateTypes.Referral:
          return {
            label: translations("Referral"),
            templateLabel: translations("WhatsApp Template for Referral"),
            templateDescription: `Dynamic variables - {{1}} - ${translations("referral code")}, {{2}} - ${translations("referral link")}`,
          };
        case LoyaltyTemplateTypes.CustomerRemoval:
          return {
            label: translations("Customer Removal from Loyalty"),
          };
        case LoyaltyTemplateTypes.RewardsIssued:
          return {
            label: translations("Rewards Issue list"),
          };
        default:
          return {
            label: "",
            templateLabel: "",
            templateDescription: "",
          };
      }
    },
    [translations],
  );
}

type LoyaltyTemplate = {
  type: string;
  requestMessage: string;
  responseType: string;
  id?: string;
};
function useLoyaltyTemplateColumns(
  setSelectedConfig: (value: LoyaltyTemplateConfig | null) => void,
  open: () => void,
  openDialog: () => void,
) {
  const { t: translations } = useTranslation();
  const getLoyaltyTemplateLabel = useLoyaltyTemplateLabel();
  const columnHelper = createColumnHelper<LoyaltyTemplate>();

  return useMemo(
    () => [
      columnHelper.accessor((row) => getLoyaltyTemplateLabel(row.type).label, {
        id: "type",
        header: () => <span>Type</span>,
      }),
      columnHelper.accessor((row) => row.requestMessage, {
        id: "requestMessage",
        header: translations("Request Message"),
      }),
      columnHelper.accessor((row) => row.responseType, {
        id: "responseType",
        header: () => <span>{translations("Response Type")}</span>,
        cell: ({ getValue }) => {
          return (
            <Badge
              variant="outline"
              className={getResponseTypeBadgeClass(getValue())}
            >
              {getValue()}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "action",
        header: "",
        cell: ({ row }) => {
          const selectedRow = row.original;

          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setSelectedConfig(selectedRow);
                  open();
                }}
              >
                <IconEdit className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setSelectedConfig(selectedRow);
                  openDialog();
                }}
                className="text-destructive hover:text-destructive"
              >
                <IconTrash className="size-4" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [
      columnHelper,
      getLoyaltyTemplateLabel,
      open,
      openDialog,
      setSelectedConfig,
      translations,
    ],
  );
}

function getResponseTypeBadgeClass(value: string) {
  switch (value) {
    case WaAutomatedReplyResponseType.Template:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    case WaAutomatedReplyResponseType.Text:
      return "border-sky-500/30 bg-sky-500/10 text-sky-700";
    default:
      return "";
  }
}

function sanitizeConfig(
  config: LoyaltyTemplateConfig,
): Partial<LoyaltyTemplateFormValues> {
  return {
    type: normalizeTemplateType(config.type),
    waTemplateId: config.waTemplateId || "",
    requestMessage: config.requestMessage || "",
    content: config.content || "",
    responseType: normalizeResponseType(config.responseType),
    whatsappSettingsPhoneId: config.whatsappSettingsPhoneId || "",
  };
}

function normalizeTemplateType(value?: string): LoyaltyTemplateTypes {
  if (
    value &&
    Object.values(LoyaltyTemplateTypes).includes(value as LoyaltyTemplateTypes)
  ) {
    return value as LoyaltyTemplateTypes;
  }

  return LoyaltyTemplateTypes.PointInformation;
}

function normalizeResponseType(value?: string): WaAutomatedReplyResponseType {
  if (
    value &&
    Object.values(WaAutomatedReplyResponseType).includes(
      value as WaAutomatedReplyResponseType,
    )
  ) {
    return value as WaAutomatedReplyResponseType;
  }

  return WaAutomatedReplyResponseType.Template;
}

function useLoyaltyTemplateVariableMeta() {
  const { t: translations } = useTranslation();

  return useCallback(
    (type: string) => {
      switch (type) {
        case LoyaltyTemplateTypes.CustomerRegistration:
          return [
            {
              token: "{{1}}",
              label: translations("customer name"),
              sample: "Alex Morgan",
            },
          ];
        case LoyaltyTemplateTypes.PointInformation:
          return [
            {
              token: "{{1}}",
              label: translations("Current point balance"),
              sample: "1280",
            },
            {
              token: "{{2}}",
              label: translations("Redeemed points"),
              sample: "120",
            },
            {
              token: "{{3}}",
              label: translations("Total earned points"),
              sample: "1400",
            },
          ];
        case LoyaltyTemplateTypes.Referral:
          return [
            {
              token: "{{1}}",
              label: translations("referral code"),
              sample: "RATEUP50",
            },
            {
              token: "{{2}}",
              label: translations("referral link"),
              sample: "https://rateup.shop/refer/RATEUP50",
            },
          ];
        default:
          return [];
      }
    },
    [translations],
  );
}

function replaceDynamicVariables({
  message,
  variableMeta,
}: {
  message: string;
  variableMeta: Array<{ token: string; sample: string }>;
}) {
  return variableMeta.reduce((acc, variable) => {
    return acc.replaceAll(variable.token, variable.sample);
  }, message);
}

function getPlainTextFromRichContent(content: any): string {
  if (!content) return "";

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(getPlainTextFromRichContent).join(" ");
  }

  if (typeof content === "object") {
    const text = typeof content.text === "string" ? content.text : "";
    const nested = Array.isArray(content.content)
      ? content.content.map(getPlainTextFromRichContent).join(" ")
      : "";

    return `${text} ${nested}`.trim();
  }

  return "";
}

function useSampleReplyMessage() {
  const { t: translations } = useTranslation();

  return useCallback(
    ({
      responseType,
      content,
      waTemplateId,
      selectedTemplate,
      variableMeta,
    }) => {
      if (responseType === WaAutomatedReplyResponseType.Template) {
        const templateName = selectedTemplate?.data?.name;
        const templateBody = getWaTemplateBodyText(
          selectedTemplate?.data?.components,
        );

        if (templateBody?.trim().length) {
          const previewBody = replaceDynamicVariables({
            message: templateBody,
            variableMeta,
          });

          return templateName?.trim().length
            ? `${templateName}\n\n${previewBody}`
            : previewBody;
        }

        if (!waTemplateId?.trim().length) {
          return translations("Template not selected yet");
        }

        if (templateName?.trim().length) {
          return `${translations("Template selected")}: ${templateName}`;
        }

        return `${translations("Template selected")}: ${waTemplateId}`;
      }

      if (!content?.trim().length) {
        return translations("No response content yet");
      }

      return replaceDynamicVariables({
        message: content,
        variableMeta,
      });
    },
    [translations],
  );
}

function getWaTemplateBodyText(templateComponents?: Array<any>) {
  if (!Array.isArray(templateComponents)) {
    return "";
  }

  const bodyComponent = templateComponents.find(
    (component) =>
      String(component?.type || "").toUpperCase() === "BODY" &&
      typeof component?.text === "string",
  );

  return bodyComponent?.text || "";
}
