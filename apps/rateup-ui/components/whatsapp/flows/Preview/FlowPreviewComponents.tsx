import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Image,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconCalendar,
  IconCamera,
  IconChevronRight,
  IconDotsVertical,
  IconFile,
  IconFileText,
  IconX,
} from "@tabler/icons-react";

import {
  WaFlowFormElementType,
  WaFlowFormNonInputElementType,
} from "../../../../types/enums";
import { WaFlowFormElement } from "../../../../types/global";
import { getTextStyle } from "../FlowPage/EditFlow/FlowTextDetailedView";
import styles from "./preview.module.css";

export function FlowTextPreview({
  text,
  type,
  fontWeight,
  strikethrough,
}: {
  text: string;
  type: WaFlowFormNonInputElementType;
  fontWeight?: string;
  strikethrough?: boolean;
}) {
  return (
    <span
      className={styles[type]}
      style={{
        ...getTextStyle(fontWeight, true),
        textDecoration: strikethrough ? "line-through" : "normal",
      }}
    >
      {text}
    </span>
  );
}

export function FlowTextInputPreview({ label = "Label" }: { label?: string }) {
  return (
    <TextInput
      variant="unstyled"
      classNames={{
        input: `${styles.textInput} ${styles.font}`,
      }}
      placeholder={label}
    />
  );
}

export function FlowTextAreaPreview({ label = "Label" }: { label?: string }) {
  return (
    <Textarea
      variant="unstyled"
      classNames={{
        input: `${styles.textInput} ${styles.font}`,
      }}
      rows={4}
      placeholder={label}
    />
  );
}

export function FlowDateInputPreview({ label = "Label" }: { label?: string }) {
  return (
    <DatePickerInput
      label={label}
      variant="unstyled"
      classNames={{
        input: `${styles.textInput} ${styles.font}`,
      }}
      placeholder="dd/mm/yyyy"
      rightSection={<IconCalendar />}
    />
  );
}

export function FlowFileInputPreview({
  label = "Label",
  type = "photo",
}: {
  label?: string;
  type: "photo" | "document";
}) {
  return (
    <Box>
      <Text>{label}</Text>
      <Button
        variant="outline"
        leftSection={type === "photo" ? <IconCamera /> : <IconFileText />}
        fullWidth
        radius={"xl"}
      >
        {type === "photo" ? "Take photo" : "Upload Document"}
      </Button>
    </Box>
  );
}
export function FlowRadioPreview({
  label = "Label",
  options,
}: {
  label?: string;
  options: string[];
}) {
  return (
    <Radio.Group
      name="preview"
      label={label}
      classNames={{
        label: `${styles.inputLabel} ${styles.font}`,
      }}
    >
      <Stack mt="xs">
        {options?.map((option, index) => (
          <Radio
            styles={{
              body: {
                justifyContent: "space-between",
              },
            }}
            labelPosition="left"
            key={option}
            variant="outline"
            label={option}
            value={option}
          />
        ))}
      </Stack>
    </Radio.Group>
  );
}

export function FlowCheckBoxPreview({
  label = "Label",
  options,
}: {
  label?: string;
  options: string[];
}) {
  return (
    <Checkbox.Group
      label={label}
      classNames={{
        label: `${styles.inputLabel} ${styles.font}`,
      }}
    >
      <Stack mt="xs">
        {options?.map((option, index) => (
          <Checkbox
            styles={{
              body: {
                justifyContent: "space-between",
              },
            }}
            labelPosition="left"
            key={option}
            label={option}
            value={option}
          />
        ))}
      </Stack>
    </Checkbox.Group>
  );
}

export function DropDownPreview({
  label = "Label",
  options,
}: {
  label?: string;
  options: string[];
}) {
  return (
    <TextInput
      variant="unstyled"
      placeholder={label}
      value={""}
      onChange={() => {}}
      classNames={{
        input: styles.textInput,
      }}
      styles={{
        input: {
          caretColor: "transparent",
        },
        root: {
          cursor: "pointer",
        },
        section: {
          cursor: "pointer",
        },
      }}
      rightSection={<IconChevronRight />}
    />
  );
}
export function FlowOptInPreview({ label = "Label" }: { label?: string }) {
  return (
    <Checkbox
      label={label}
      classNames={{
        label: `${styles.inputLabel} ${styles.font}`,
      }}
    />
  );
}
interface FlowImagePreviewProps {
  src: string;
  width?: number;
  height?: number;
}
export function FlowImagePreview({
  src,
  width,
  height,
}: FlowImagePreviewProps) {
  return (
    <Image
      style={{
        margin: "auto",
        marginTop: 0,
        marginBottom: 0,
      }}
      src={`data:image/png;base64,${src}`}
      w={width}
      h={height}
    />
  );
}

/**
 * The popup that appears when you click on the "Open" button in the FlowChatPreview.
 * @param param0
 * @returns
 */
export function FlowPreviewContainer({ children, footerLabel }) {
  return (
    <Stack
      style={{
        backgroundColor: "white",
        borderRadius: "12px 12px 0px 0px",
        padding: "0px 4px 8px 4px",
        height: "90%",
      }}
      gap={0}
    >
      {FlowContainerHeader(() => {})}
      <Divider />
      <Stack
        style={{
          flex: 1,
          overflowY: "scroll",
        }}
        pb={"sm"}
        gap={0}
      >
        <Stack px={"sm"} pt={"sm"}>
          {children}
        </Stack>
      </Stack>
      <Button
        radius={"xl"}
        mx={4}
        style={{
          justifySelf: "end",
        }}
      >
        {footerLabel ?? "Next"}
      </Button>
    </Stack>
  );
}

interface FlowFormElementPreviewProps {
  fe: WaFlowFormElement;
}

/**
 * Contains close button and the 3 dots icon.
 * @param onClose
 * @returns
 */
function FlowContainerHeader(onClose: any) {
  return (
    <Group justify="space-between" m={0} p={0}>
      <ActionIcon variant="transparent" color="gray" onClick={onClose} my={8}>
        <IconX />
      </ActionIcon>
      <IconDotsVertical scale={0.8} />
    </Group>
  );
}

export function FlowFormElementPreview({ fe }: FlowFormElementPreviewProps) {
  switch (fe.type) {
    case WaFlowFormElementType.textHeading:
    case WaFlowFormElementType.textSubHeading:
    case WaFlowFormElementType.textBody:
    case WaFlowFormElementType.textCaption:
    case WaFlowFormElementType.nonInputText:
      return (
        <FlowTextPreview
          text={fe.text}
          type={fe.type as any}
          fontWeight={fe["font-weight"]}
          strikethrough={fe.strikethrough}
        />
      );

    case WaFlowFormElementType.textInput:
      return <FlowTextInputPreview label={fe.label} />;
    case WaFlowFormElementType.textArea:
      return <FlowTextAreaPreview label={fe.label} />;
    case WaFlowFormElementType.datePicker:
      return <FlowDateInputPreview label={fe.label} />;
    case WaFlowFormElementType.radioButtonsGroup:
      return (
        <FlowRadioPreview
          label={fe.label}
          options={
            typeof fe["data-source"] !== "string" &&
            fe["data-source"]?.map((ds) => ds.title)
          }
        />
      );
    case WaFlowFormElementType.checkboxGroup:
      return (
        <FlowCheckBoxPreview
          label={fe.label}
          options={
            typeof fe["data-source"] !== "string" &&
            fe["data-source"]?.map((ds) => ds.title)
          }
        />
      );
    case WaFlowFormElementType.dropDown:
      return (
        <DropDownPreview
          label={fe.label}
          options={
            typeof fe["data-source"] !== "string" &&
            fe["data-source"]?.map((ds) => ds.title)
          }
        />
      );
    case WaFlowFormElementType.optIn:
      return <FlowOptInPreview label={fe.label} />;
    case WaFlowFormElementType.embeddedLink:
      return (
        <Text c={"blue"} ta={"center"}>
          {fe?.text}
        </Text>
      );
    case WaFlowFormElementType.image:
      return (
        <FlowImagePreview src={fe.src} width={fe.width} height={fe.height} />
      );
    case WaFlowFormElementType.photoPicker:
      return <FlowFileInputPreview label={fe.label} type={"photo"} />;
    case WaFlowFormElementType.documentPicker:
      return <FlowFileInputPreview label={fe.label} type={"document"} />;
    default:
      throw new Error("Invalid form element type");
  }
}
