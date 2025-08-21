import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Box,
  Button,
  FileButton,
  Group,
  Stack,
  Text,
  Textarea,
  TextareaProps,
  TextInputProps,
  Title,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { IconCircleCheck, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useSurvey } from "../../../backend/surveys/surveys.query";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "../../../backend/whatsapp/flow/flow.query";
import { SaveStatus } from "../../../types/enums";
import { WaFlowStartMessageConfig } from "../../../types/global";
import {
  getFileUrlFromKey,
  uploadFile,
} from "../../../utils/file-upload/upload";
import { showErrorToast } from "../../../utils/notifications";
import { generateWaSurveyIdentifier_byName } from "../../../utils/whatsapp/wa_url";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import { LengthTracker, LengthTrackerProps } from "../../input/LengthTracker";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import {
  SentMessageContainer,
  WaResponseMessage,
} from "../../whatsapp/MessageComponents";
import templateStyles from "../../whatsapp/templates/template.module.css";
import whatsappStyles from "../../whatsapp/whatsapp.module.css";

const exceed = (l: number) => `Cannot exceed ${l} characters.`;
const empty = `Cannot be empty.`;

/** Checks is all properties in ob1 is equal to that in ob2 */
function isEqual(ob1: object, ob2: object): boolean {
  return Object.keys(ob1).every((k) => {
    if (ob1[k] != ob2[k]) console.log(k, ob1[k], ob2[k]);
    return ob1[k] == ob2[k];
  });
}

export function FlowShareTemplateEditor({
  form,
  dbFlowId,
  updateMutation,
  initialValues,
}) {
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const [status, setStatus] = useState(SaveStatus.saved);

  form.setInitialValues(initialValues);

  useEffect(() => {
    if (!isEqual(form.values, initialValues)) return;
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.templateMessage)) return;
    form.reset();
  }, [dbFlow]);
  // autosave

  useEffect(() => {
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.templateMessage)) return;
    setStatus(SaveStatus.notSaved);

    const timer = setTimeout(() => {
      setStatus(SaveStatus.saving);

      updateMutation.mutate(
        {
          dbFlowId,
          data: { templateMessage: form.values },
        },
        {
          onSuccess: () => setStatus(SaveStatus.saved),
          onError: () => setStatus(SaveStatus.notSaved),
        },
      );
    }, 1000 * 1.5);

    return () => clearTimeout(timer);
  }, [form.values]);

  const max_mb = 1;
  const onImageUpload = (event: File) => {
    if (!event) return;
    if (event.size > max_mb * 1024 * 1024) {
      showErrorToast(`Max file size is ${max_mb} MB`);
      return;
    }
    setImageToUpload(event);
  };
  const translations = useTranslations();
  const [imageToUpload, setImageToUpload] = useState(null);

  // saving image
  useEffect(() => {
    if (imageToUpload) {
      uploadFile(imageToUpload)
        .then((fileKey) => {
          form.setFieldValue("headerImage", fileKey);
        })
        .catch((e) => console.error(e));
    }
  }, [imageToUpload]);

  function handleRemoveImage() {
    form.setFieldValue("headerImage", "");
    setImageToUpload(null);
  }

  return (
    <Stack gap={0}>
      <Group mb="4">
        <Title order={4}>{translations("Edit Template Message")}</Title>
        <SaveStatusIndicator status={status} />
      </Group>

      <Stack
        bg={"whitesmoke"}
        p="md"
        style={{
          borderRadius: "8px",
          flex: 1,
        }}
      >
        <Group>
          <FileButton
            onChange={onImageUpload}
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
          >
            {(props) => {
              return (
                <Button {...props}>
                  {imageToUpload
                    ? translations("Change Image")
                    : translations("Upload Image")}
                </Button>
              );
            }}
          </FileButton>

          <Button variant="outline" onClick={handleRemoveImage}>
            {translations("Remove Image")}
          </Button>
        </Group>

        <TextareaWithLengthTracker
          label={translations("Body")}
          {...form.getInputProps("body")}
          maxValue={1024}
        />
        <TextInputWithLengthTracker
          label={translations("Footer")}
          {...form.getInputProps("footer")}
          maxValue={60}
        />
        <TextInputWithLengthTracker
          label={"CTA"}
          maxValue={20}
          {...form.getInputProps("cta")}
        />
      </Stack>
    </Stack>
  );
}

interface FlowStartMessageEditorProps {
  form: UseFormReturnType<WaFlowStartMessageConfig>;
  dbFlowId: string;
  updateMutation: any;
  initialValues: WaFlowStartMessageConfig;
}
export function FlowStartMessageEditor({
  form,
  dbFlowId,
  updateMutation,
  initialValues,
}: FlowStartMessageEditorProps) {
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const [status, setStatus] = useState(SaveStatus.saved);

  form.setInitialValues(initialValues);

  useEffect(() => {
    if (!isEqual(form.values, initialValues)) return;
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.startMessageConfig)) return;
    form.reset();
  }, [dbFlow]);
  // autosave

  useEffect(() => {
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.startMessageConfig)) return;
    setStatus(SaveStatus.notSaved);

    const timer = setTimeout(() => {
      setStatus(SaveStatus.saving);

      updateMutation.mutate(
        {
          dbFlowId,
          data: { startMessageConfig: form.values },
        },
        {
          onSuccess: () => setStatus(SaveStatus.saved),
          onError: () => setStatus(SaveStatus.notSaved),
        },
      );
    }, 1000 * 1.5);

    return () => clearTimeout(timer);
  }, [form.values]);
  const translations = useTranslations();
  return (
    <Stack gap={0}>
      <Group mb="4">
        <Title order={4}>{translations("Edit Start Message")}</Title>
        <SaveStatusIndicator status={status} />
      </Group>

      <Stack
        bg={"whitesmoke"}
        p="md"
        style={{
          borderRadius: "8px",
          flex: 1,
        }}
      >
        <TextareaWithLengthTracker
          label={translations("Body")}
          {...form.getInputProps("prefix")}
          maxValue={1024}
        />
        <TextareaWithLengthTracker
          label={translations("Suffix")}
          {...form.getInputProps("suffix")}
          maxValue={1024}
        />
      </Stack>
    </Stack>
  );
}

export function FlowShareMessageEditor({ selectedTeamCode }) {
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;

  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const { data: survey } = useSurvey(dbFlow?.surveyId);
  const updateMutation = useUpdateFlowMutation();
  const templateInitialValues = generateTemplateInitialValues(dbFlow);

  const templateForm = useForm({
    initialValues: templateInitialValues,
    validate: templateFormValidation,
    validateInputOnChange: true,
  });

  const startMessageInitialValues = generateStartMessageInitialValues(dbFlow);
  const startMessageForm = useForm<WaFlowStartMessageConfig>({
    initialValues: startMessageInitialValues,
  });
  const translations = useTranslations();
  return (
    <PaperLayout
      p="30px"
      style={{
        boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
        overflowX: "auto",
      }}
    >
      <Group align={"stretch"} h={"100%"}>
        <Stack
          style={{
            flex: 1,
          }}
          gap={"xl"}
        >
          <FlowStartMessageEditor
            form={startMessageForm}
            dbFlowId={dbFlowId}
            updateMutation={updateMutation}
            initialValues={startMessageInitialValues}
          />
          <FlowShareTemplateEditor
            form={templateForm}
            dbFlowId={dbFlowId}
            updateMutation={updateMutation}
            initialValues={templateInitialValues}
          />
        </Stack>
        <Stack
          gap={0}
          style={{
            flex: 1,
            maxWidth: "400px",
          }}
        >
          <Group mb="4" justify={"center"}>
            <Title order={4}>{translations("Preview")}</Title>
          </Group>
          <Box
            className={whatsappStyles.chatBg}
            p="lg"
            style={{
              borderRadius: "8px",
              overflow: "hidden",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "end",
            }}
            mx={"sm"}
          >
            <Stack>
              <SentMessageContainer>
                <Group align={"center"} pl={"xs"} h={"100%"}>
                  <p>
                    <RenderNewLine text={startMessageForm.values.prefix} />
                    <code
                      style={{
                        backgroundColor: "rgba(11, 20, 26, .05)",
                        color: "rgba(17, 27, 33, .7)",
                        display: "inline-block",
                        font: "inherit",
                        fontSize: ".9rem",
                      }}
                    >
                      {generateWaSurveyIdentifier_byName(
                        survey?.title,
                        selectedTeamCode,
                      ).replaceAll("`", "")}
                    </code>
                    <RenderNewLine text={startMessageForm.values.suffix} />
                  </p>
                </Group>
              </SentMessageContainer>

              <WaResponseMessage
                header={templateForm.values.header}
                footer={templateForm.values.footer}
                body={templateForm.values.body}
                quickReplyButtons={[templateForm.values.cta]}
                image={getFileUrlFromKey(templateForm.values.headerImage)}
              />
            </Stack>
          </Box>
        </Stack>
      </Group>
    </PaperLayout>
  );
}

function RenderNewLine({ text }) {
  return text.split("\n").map((t, i) => {
    return <p key={i}>{t}</p>;
  });
}

type TextInputWithLengthTrackerProps = TextInputProps &
  Omit<LengthTrackerProps, "length"> & {
    value?: string;
  };

export function TextInputWithLengthTracker(
  props: TextInputWithLengthTrackerProps,
) {
  const { maxValue, styles, ...restOfProps } = props;
  const length = props.value?.length || 0;
  const { input, ...restOfStyles } = styles || ({} as any);

  return (
    <ContainedTextField
      rightSection={<LengthTracker length={length} maxValue={maxValue} />}
      styles={{
        input: {
          paddingRight: "80px",
          ...input,
        },
        ...restOfStyles,
      }}
      rightSectionProps={{
        style: {
          width: "80px",
        },
      }}
      {...restOfProps}
    />
  );
}

type TextareaWithLengthTrackerProps = TextareaProps &
  Omit<LengthTrackerProps, "length"> & {
    value?: string;
  };

export function TextareaWithLengthTracker(
  props: TextareaWithLengthTrackerProps,
) {
  const { maxValue, styles, ...restOfProps } = props;
  const length = props.value?.length || 0;
  const { input, ...restOfStyles } = styles || ({} as any);

  return (
    <Textarea
      rightSection={<LengthTracker length={length} maxValue={maxValue} />}
      styles={{
        input: {
          paddingRight: "80px",
          borderRadius: "12px",
          ...input,
        },
        ...restOfStyles,
      }}
      rightSectionProps={{
        style: {
          width: "80px",
        },
      }}
      {...restOfProps}
    />
  );
}

interface SaveStatusProps {
  readonly status: SaveStatus;
}
export function SaveStatusIndicator({ status }: SaveStatusProps) {
  return (
    <Group
      style={{
        color: "gray",
      }}
      gap={"4px"}
    >
      {status === SaveStatus.saved ? (
        <IconCircleCheck />
      ) : (
        <IconRefresh
          className={
            status === SaveStatus.saving ? templateStyles.rotateInfinitely : ""
          }
        />
      )}
      <Text>{status}</Text>
    </Group>
  );
}

function generateTemplateInitialValues(dbFlow: DbFlow) {
  return {
    header: dbFlow.templateMessage.header || "",
    headerImage: dbFlow.templateMessage.headerImage || null,
    body: dbFlow.templateMessage.body || "Would you like to start survey?",
    footer: dbFlow.templateMessage.footer || "",
    cta: dbFlow.templateMessage.cta || "Open",
  };
}

function generateStartMessageInitialValues(
  dbFlow: DbFlow,
): WaFlowStartMessageConfig {
  return {
    prefix:
      dbFlow.startMessageConfig.prefix ||
      "Send this message to start survey.\n",
    suffix: dbFlow.startMessageConfig.suffix || "",
  };
}

const templateFormValidation = {
  header: (h) => h.length > 60 && exceed(60),
  body: (b) => {
    if (b.length === 0) {
      return empty;
    } else if (b.length > 1024) {
      return exceed(1024);
    }
  },
  footer: (f) => f.length > 60 && exceed(60),
  cta: (c) => {
    if (c.length === 0) {
      return empty;
    } else if (c.length > 20) {
      return exceed(20);
    }
  },
};
