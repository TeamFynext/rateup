import { IconPhoto, IconRefresh } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useId, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import type { MetaAssets } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useSyncLeadgenFormQuestions,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { LeadgenNodeData } from "@/components/whatsapp/automation/types/node-types.ts";
import { cn } from "@/lib/utils.ts";

interface Props {
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT";
  buildtemplatequerycomponent: (
    component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
    component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT",
    component_data: any,
  ) => void;
  exampleParams?: Array<string | { type: string; [key: string]: unknown }>;
  leadgenData?: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
}

export default function WaTemplateFormComponents(props: Props) {
  const headerParam = props.exampleParams?.find(
    (item): item is { type: string; [key: string]: unknown } =>
      typeof item === "object" && item.type === props?.type?.toLowerCase(),
  );
  const header = headerParam?.[props?.type?.toLowerCase()];

  switch (props?.type) {
    case "IMAGE":
    case "VIDEO":
    case "DOCUMENT":
      return (
        <div className="shadow-xs p-3 bg-card border rounded-lg flex flex-col gap-2.5">
          <Badge variant="secondary" className="w-fit">
            {props?.type}
          </Badge>
          <div className="border-t border-dotted border-border" />
          <WaDropZoneInputComponent
            type={props?.type}
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
          />
        </div>
      );
    case "LOCATION":
      return (
        <div className="shadow-xs p-3 bg-card border rounded-lg flex flex-col gap-2.5">
          <Badge variant="secondary" className="w-fit">
            {props?.type}
          </Badge>
          <div className="border-t border-dotted border-border" />
          <WaLocationInputComponent
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
            defaultValue={header}
          />
        </div>
      );
    case "TEXT":
      return (
        <div className="shadow-xs p-3 bg-card border rounded-lg flex flex-col gap-2.5">
          <Badge variant="secondary" className="w-fit">
            {props?.type}
          </Badge>
          <div className="border-t border-dotted border-border" />
          <WaBodyVariableInputComponent
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
            exampleParams={props.exampleParams}
            leadgenData={props?.leadgenData}
          />
        </div>
      );
  }
}

function WaDropZoneInputComponent(props: Props) {
  const { t: translations } = useTranslation();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size <= 5 * 1024 * 1024) {
        props?.buildtemplatequerycomponent("HEADER", props?.type as any, {
          link: file,
        });
      } else {
        toast.error("File size exceeds 5MB");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size <= 5 * 1024 * 1024) {
        props?.buildtemplatequerycomponent("HEADER", props?.type as any, {
          link: file,
        });
      } else {
        toast.error("File size exceeds 5MB");
      }
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-muted/30 min-h-[100px]",
        dragActive && "border-primary bg-primary/5",
      )}
    >
      <input
        type="file"
        className="absolute inset-0 opacity-0 cursor-pointer"
        accept={
          props?.type === "IMAGE"
            ? "image/*"
            : props?.type === "DOCUMENT"
              ? "application/pdf"
              : "*/*"
        }
        onChange={handleChange}
      />
      <IconPhoto size={32} className="text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">
          {translations("Drag")} {props?.type} {translations("here or click to select files")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {translations("Attach as many files as you like, each file should not exceed 5mb")}
        </p>
      </div>
    </div>
  );
}

function WaLocationInputComponent({
  buildtemplatequerycomponent,
  defaultValue,
}: {
  buildtemplatequerycomponent: (
    component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
    component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION",
    component_data: any,
  ) => void;
  defaultValue?: any;
}) {
  const uid = useId();
  const [latitude, setLatitude] = useState(defaultValue?.latitude || "");
  const [longitude, setLongitude] = useState(defaultValue?.longitude || "");
  const [name, setName] = useState(defaultValue?.name || "");
  const [address, setAddress] = useState(defaultValue?.address || "");
  const { t: translations } = useTranslation();
  return (
    <>
      <Field className="w-full">
        <FieldLabel
          htmlFor={`${uid}-field`}
          className="text-xs font-semibold text-muted-foreground"
        >
          {translations("Latitude")}
        </FieldLabel>
        <Input
          id={`${uid}-field`}
          type="text"
          value={latitude}
          onChange={(e) => {
            setLatitude(e.currentTarget.value);
            buildtemplatequerycomponent("HEADER", "LOCATION", {
              latitude: e.currentTarget.value,
              longitude,
              name,
              address,
            });
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel
          htmlFor={`${uid}-field-2`}
          className="text-xs font-semibold text-muted-foreground"
        >
          {translations("Longitude")}
        </FieldLabel>
        <Input
          id={`${uid}-field-2`}
          type="text"
          value={longitude}
          onChange={(e) => {
            setLongitude(e.currentTarget.value);
            buildtemplatequerycomponent("HEADER", "LOCATION", {
              latitude,
              longitude: e.currentTarget.value,
              name,
              address,
            });
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel
          htmlFor={`${uid}-field-3`}
          className="text-xs font-semibold text-muted-foreground"
        >
          {translations("Name")}
        </FieldLabel>
        <Input
          id={`${uid}-field-3`}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value);
            buildtemplatequerycomponent("HEADER", "LOCATION", {
              latitude,
              longitude,
              name: e.currentTarget.value,
              address,
            });
          }}
        />
      </Field>
      <Field className="w-full">
        <FieldLabel
          htmlFor={`${uid}-field-4`}
          className="text-xs font-semibold text-muted-foreground"
        >
          {translations("Address")}
        </FieldLabel>
        <Input
          id={`${uid}-field-4`}
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.currentTarget.value);
            buildtemplatequerycomponent("HEADER", "LOCATION", {
              latitude,
              longitude,
              name,
              address: e.currentTarget.value,
            });
          }}
        />
      </Field>
    </>
  );
}

function WaBodyVariableInputComponent({
  buildtemplatequerycomponent,
  exampleParams,
  leadgenData,
}: {
  buildtemplatequerycomponent: (
    component_type: "BODY",
    component_format: "TEXT",
    component_data: any,
  ) => void;
  exampleParams?: Array<string | { type: string; [key: string]: unknown }>;
  leadgenData?: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
}) {
  const uid = useId();
  const [paramChoice, setParamChoice] = useState<string[]>([]);
  const [dynamicTags, setDynamicTags] = useState<any[]>(exampleParams || []);

  const updateParamChoice = (index: number, value: string) => {
    setParamChoice((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const updateDynamicTag = (index: number, value: any) => {
    const nextTags = [...dynamicTags];
    nextTags[index] = value;
    setDynamicTags(nextTags);
    buildtemplatequerycomponent("BODY", "TEXT", nextTags);
  };

  useEffect(() => {
    setDynamicTags(exampleParams || []);
  }, [exampleParams]);

  useEffect(() => {
    if (exampleParams?.length) {
      setParamChoice(
        exampleParams.map((param) => {
          if (typeof param === "string" || param?.type !== "leadgenform-question-key") {
            return "default";
          }
          return "leadgenform-question-key";
        }),
      );
    }
  }, [exampleParams]);

  const { t: translations } = useTranslation();
  return (
    <>
      {exampleParams?.map((_, i) => {
        if (leadgenData)
          return (
            <div className="flex flex-col gap-2" key={i}>
              <RadioGroup
                value={paramChoice[i]}
                onValueChange={(val) => {
                  updateDynamicTag(i, "");
                  updateParamChoice(i, val);
                }}
                className="flex flex-row gap-4 items-center"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value="default" id={`radio-default-${i}`} />
                  <FieldLabel
                    htmlFor={`radio-default-${i}`}
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Manual
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem value="leadgenform-question-key" id={`radio-leadgen-${i}`} />
                  <FieldLabel
                    htmlFor={`radio-leadgen-${i}`}
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Select from lead form
                  </FieldLabel>
                </Field>
              </RadioGroup>
              {paramChoice[i] === "default" && (
                <Field className="w-full">
                  <FieldLabel
                    htmlFor={`${uid}-field-5-${i}`}
                    className="text-xs font-semibold text-muted-foreground"
                  >{`{{${i + 1}}}`}</FieldLabel>
                  <Input
                    id={`${uid}-field-5-${i}`}
                    type="text"
                    placeholder={translations("select a dynamic tag value")}
                    value={dynamicTags[i] || ""}
                    onChange={(e) => updateDynamicTag(i, e.target.value)}
                  />
                </Field>
              )}
              {paramChoice[i] === "leadgenform-question-key" && (
                <LeadFormQuestionsInputComponent
                  leadgenData={leadgenData}
                  value={dynamicTags[i]?.value ?? ""}
                  onChange={(value) =>
                    updateDynamicTag(i, {
                      type: "leadgenform-question-key",
                      value,
                    })
                  }
                  label={`{{${i + 1}}}`}
                />
              )}
            </div>
          );
        return (
          <Field className="w-full" key={i}>
            <FieldLabel
              htmlFor={`${uid}-field-6-${i}`}
              className="text-xs font-semibold text-muted-foreground"
            >{`{{${i + 1}}}`}</FieldLabel>
            <Input
              id={`${uid}-field-6-${i}`}
              type="text"
              placeholder={translations("select a dynamic tag value")}
              value={dynamicTags[i] || ""}
              onChange={(e) => updateDynamicTag(i, e.target.value)}
            />
          </Field>
        );
      })}
    </>
  );
}

interface LeadFormQuestionsInputComponentProps {
  leadgenData: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function LeadFormQuestionsInputComponent(props: LeadFormQuestionsInputComponentProps) {
  const uid = useId();
  const params = useParams({
    strict: false,
  });
  const automatedId = params.waAutomatedReplyId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data: automatedReply, isPending } = useWaAutomatedReplyById(automatedId);
  const isLeadAutomation = automatedReply && automatedReply?.commands[0]?.startsWith("lead");
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === automatedReply?.whatsappSettingsPhoneId) ??
      waSettings[0]);
  const waSettingsId = automatedReply && isLeadAutomation && waSetting ? waSetting.id : null;
  const syncformQuestionsMut = useSyncLeadgenFormQuestions(
    props.leadgenData.data.leadgenFormId,
    waSettingsId,
  );
  const data = props.leadgenData.formQuestions.map((q) => q.key);

  if (isPending || isSettingsLoading) return <RateupLoader />;

  return (
    <Field className="items-end w-full">
      <Field className="flex-1">
        <FieldLabel
          htmlFor={`${uid}-field-7`}
          className="text-xs font-semibold text-muted-foreground"
        >
          {"Form question key for " + props.label}
        </FieldLabel>
        <Select value={props.value} onValueChange={(value) => props.onChange(value ?? "")}>
          <SelectTrigger id={`${uid}-field-7`} className="w-full">
            <SelectValue placeholder="Click to select" />
          </SelectTrigger>
          <SelectContent>
            {data.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="mt-6 h-9 w-9 shrink-0"
                disabled={syncformQuestionsMut.isPending}
                onClick={() =>
                  syncformQuestionsMut.mutate({
                    fbPageId: props.leadgenData.data.fbPageId,
                    pageAccessToken: props.leadgenData.data.pageAccessToken,
                  })
                }
              />
            }
          >
            {syncformQuestionsMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh size={16} />
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Sync form questions if not found.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Field>
  );
}
