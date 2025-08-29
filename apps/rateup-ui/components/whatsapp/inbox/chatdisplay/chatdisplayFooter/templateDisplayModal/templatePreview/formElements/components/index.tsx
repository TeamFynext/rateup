"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Divider,
  Group,
  Paper,
  Radio,
  RadioGroup,
  rem,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { useListState } from "@mantine/hooks";
import { IconPhoto, IconRefresh, IconUpload, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { MetaAssets } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useMetaAssets,
  useSyncLeadgenFormQuestions,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import {
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { LeadgenNodeData } from "@/components/whatsapp/automation/types/node-types";

import classes from "./styles.module.css";

interface Props {
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT";
  buildtemplatequerycomponent: (
    component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
    component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT",
    component_data: any,
  ) => void;
  exampleParams?: Array<{ type: string }> | string[];
  leadgenData?: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
}
export default function WaTemplateFormComponents(props: Props) {
  let header = props.exampleParams?.find(
    (item) =>
      typeof item === "object" && item.type === props?.type?.toLowerCase(),
  )?.[props?.type?.toLowerCase()];

  switch (props?.type) {
    case "IMAGE":
    case "VIDEO":
    case "DOCUMENT":
      return (
        <Paper className={classes.paper_wrapper}>
          <Badge variant="light">{props?.type}</Badge>
          <Divider variant="dotted" />
          <WaDropZoneInputComponent
            type={props?.type}
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
          />
        </Paper>
      );
    case "LOCATION":
      return (
        <Paper className={classes.paper_wrapper}>
          <Badge variant="light">{props?.type}</Badge>
          <Divider variant="dotted" />
          <WaLocationInputComponent
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
            defaultValue={header}
          />
        </Paper>
      );
    case "TEXT":
      return (
        <Paper className={classes.paper_wrapper}>
          <Badge variant="light">{props?.type}</Badge>
          <Divider variant="dotted" />
          <WaBodyVariableInputComponent
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
            exampleParams={props.exampleParams}
            leadgenData={props?.leadgenData}
          />
        </Paper>
      );
  }
}

function WaDropZoneInputComponent(props: Props) {
  function getDropZoneMimeType() {
    if (props?.type === "IMAGE") {
      return IMAGE_MIME_TYPE;
    } else if (props?.type === "DOCUMENT") {
      return PDF_MIME_TYPE;
    }
  }
  const translations = useTranslations();
  return (
    <Dropzone
      maxFiles={1}
      onDrop={(files) =>
        props?.buildtemplatequerycomponent("HEADER", props?.type, {
          link: files[0],
        })
      }
      onReject={(files) => console.log("rejected files", files)}
      maxSize={5 * 1024 ** 2}
      accept={getDropZoneMimeType()}
      {...props}
    >
      <Group
        justify="center"
        gap="xl"
        mih={100}
        style={{ pointerEvents: "none" }}
      >
        <Dropzone.Accept>
          <IconUpload
            size={30}
            color={"var(--mantine-primary-color-6)"}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX size={30} color="var(--mantine-color-red-6)" stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            size={30}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
        </Dropzone.Idle>
        <div>
          <Text className={classes.dropzone_text}>
            {translations("Drag")} {props?.type}{" "}
            {translations("here or click to select files")}
          </Text>
          <Text className={classes.dropzone_text_note}>
            {translations(
              "Attach as many files as you like, each file should not exceed 5mb",
            )}
          </Text>
        </div>
      </Group>
    </Dropzone>
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
  const [latitude, setLatitude] = useState(defaultValue?.latitude || "");
  const [longitude, setLongitude] = useState(defaultValue?.longitude || "");
  const [name, setName] = useState(defaultValue?.name || "");
  const [address, setAddress] = useState(defaultValue?.address || "");
  const translations = useTranslations();
  return (
    <>
      <ContainedTextField
        label={translations("Latitude")}
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
      <ContainedTextField
        label={translations("Longitude")}
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
      <ContainedTextField
        label={translations("Name")}
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
      <ContainedTextField
        label={translations("Address")}
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
  exampleParams?: Array<{ type: string; value?: string }> | string[];
  leadgenData?: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
}) {
  const [paramChoice, setParamChoice] = useListState([]);
  const form = useForm({
    initialValues: {
      dynamicTags: exampleParams || [],
    },
    onValuesChange: (e) => {
      buildtemplatequerycomponent("BODY", "TEXT", e.dynamicTags);
    },
  });
  useEffect(() => {
    if (exampleParams.length) {
      exampleParams.forEach((param, index) => {
        if (
          typeof param === "string" ||
          param.type !== "leadgenform-question-key"
        ) {
          setParamChoice.setItem(index, "default");
        } else {
          setParamChoice.setItem(index, "leadgenform-question-key");
        }
      });
    }
  }, [exampleParams]);
  const translations = useTranslations();
  return (
    <>
      {exampleParams?.map((_, i) =>
        leadgenData ? (
          <Stack key={i}>
            <RadioGroup
              value={paramChoice[i]}
              onChange={(value) => {
                form.setFieldValue(`dynamicTags.${i}`, "");
                setParamChoice.setItem(i, value);
              }}
            >
              <Group>
                <Radio value={"default"} label={"Manual"} />
                <Radio
                  value={"leadgenform-question-key"}
                  label={"Select from lead form"}
                />
              </Group>
            </RadioGroup>
            {paramChoice[i] === "default" && (
              <ContainedTextField
                key={i}
                label={`{{${i + 1}}}`}
                placeholder={translations("select a dynamic tag value")}
                {...form.getInputProps(`dynamicTags.${i}`)}
              />
            )}
            {paramChoice[i] === "leadgenform-question-key" && (
              <LeadFormQuestionsInputComponent
                leadgenData={leadgenData}
                value={form.values.dynamicTags[i]["value"] ?? ""}
                onChange={(value) =>
                  form.setFieldValue(`dynamicTags.${i}`, {
                    type: "leadgenform-question-key",
                    value,
                  })
                }
                label={`{{${i + 1}}}`}
              />
            )}
          </Stack>
        ) : (
          <ContainedTextField
            key={i}
            label={`{{${i + 1}}}`}
            placeholder={translations("select a dynamic tag value")}
            {...form.getInputProps(`dynamicTags.${i}`)}
          />
        ),
      )}
    </>
  );
}

interface LeadFormQuestionsInputComponentProps {
  leadgenData: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
  value: string;
  onChange: (value) => void;
  label: string;
}
function LeadFormQuestionsInputComponent(
  props: LeadFormQuestionsInputComponentProps,
) {
  const params = useParams();
  let automatedId = params.waAutomatedReplyId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const {
    data: automatedReply,
    isPending,
    refetch,
  } = useWaAutomatedReplyById(automatedId);
  const isLeadAutomation =
    automatedReply && automatedReply?.commands[0]?.startsWith("lead");
  const waSetting =
    waSettings &&
    (waSettings.find(
      (w) => w.phoneId === automatedReply.whatsappSettingsPhoneId,
    ) ??
      waSettings[0]);
  const waSettingsId =
    automatedReply && isLeadAutomation && waSetting ? waSetting.id : null;
  const syncformQuestionsMut = useSyncLeadgenFormQuestions(
    props.leadgenData.data.leadgenFormId,
    waSettingsId,
  );
  const data = props.leadgenData.formQuestions.map((q) => q.key);
  if (isPending || isSettingsLoading) return <RateupLoader />;
  return (
    <Group gap={2} w={"100%"}>
      <ContainedSelection
        label={"Form question key for " + props.label}
        data={data}
        value={props.value}
        onChange={props.onChange}
        w={"80%"}
        placeholder="Click to select"
      />
      <Tooltip label={"Sync form questions if not found."}>
        <ActionIcon
          onClick={() =>
            syncformQuestionsMut.mutate({
              fbPageId: props.leadgenData.data.fbPageId,
              pageAccessToken: props.leadgenData.data.pageAccessToken,
            })
          }
          mt={25}
          variant="light"
          loading={syncformQuestionsMut.isPending}
        >
          <IconRefresh />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
