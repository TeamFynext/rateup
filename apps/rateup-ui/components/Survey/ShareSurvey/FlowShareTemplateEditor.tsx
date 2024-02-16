import { Box, Group, Stack, Text, TextInputProps, Title } from "@mantine/core";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useForm } from "@mantine/form";
import { WaResponseMessage } from "../../whatsapp/MessageComponents";
import whatsappStyles from "../../whatsapp/whatsapp.module.css";
import { LengthTracker, LengthTrackerProps } from "../../input/LengthTracker";
import { SaveStatus } from "../../../types/enums";
import { IconCircleCheck, IconRefresh } from "@tabler/icons-react";
import templateStyles from "../../whatsapp/templates/template.module.css";
import { useRouter } from "next/router";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "../../../backend/whatsapp/flow/flow.query";
import { useEffect, useState } from "react";

const exceed = (l: number) => `Cannot exceed ${l} characters.`;
const empty = `Cannot be empty.`;

/** Checks is all properties in ob1 is equal to that in ob2 */
function isEqual(ob1: object, ob2: object): boolean {
  return Object.keys(ob1).every((k) => ob1[k] === ob2[k]);
}

export function FlowShareTemplateEditor() {
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;

  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const [status, setStatus] = useState(SaveStatus.saved);

  const initialValues = {
    header: dbFlow.templateMessage.header || "",
    body: dbFlow.templateMessage.body || "Would you like to start survey?",
    footer: dbFlow.templateMessage.footer || "",
    cta: dbFlow.templateMessage.cta || "Open",
  };
  const form = useForm({
    initialValues: initialValues,
    validate: {
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
    },
    validateInputOnChange: true,
  });

  const updateMutation = useUpdateFlowMutation();

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

  return (
    <PaperLayout
      p="30px"
      style={{
        boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
        overflowX: "auto",
      }}
    >
      <Group mb="sm">
        <Title order={4}>Edit Template Message</Title>
        <SaveStatusIndicator status={status} />
      </Group>
      <Group align={"stretch"} h={"100%"}>
        <Stack
          style={{
            flex: 1,
          }}
        >
          <TextInputWithLengthTracker
            label={"Header"}
            {...form.getInputProps("header")}
            maxValue={60}
          />
          <TextInputWithLengthTracker
            label={"Body"}
            {...form.getInputProps("body")}
            maxValue={1024}
          />
          <TextInputWithLengthTracker
            label={"Footer"}
            {...form.getInputProps("footer")}
            maxValue={60}
          />
          <TextInputWithLengthTracker
            label={"CTA"}
            maxValue={20}
            {...form.getInputProps("cta")}
          />
        </Stack>
        <Box
          className={whatsappStyles.chatBg}
          p="lg"
          style={{
            borderRadius: "8px",
            overflow: "hidden",
            flex: 1,
            maxWidth: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "end",
          }}
          m={"sm"}
        >
          <WaResponseMessage
            header={form.values.header}
            footer={form.values.footer}
            body={form.values.body}
            quickReplyButtons={[form.values.cta]}
          />
        </Box>
      </Group>
    </PaperLayout>
  );
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

interface SaveStatusProps {
  status: SaveStatus;
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
