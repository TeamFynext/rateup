import {
  TextInput,
  Textarea,
  Radio,
  Stack,
  Checkbox,
  ActionIcon,
  Group,
  Button,
  Divider,
  Image,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconCalendar,
  IconChevronRight,
  IconDotsVertical,
  IconX,
} from "@tabler/icons-react";
import {
  WaFlowFormElementType,
  WaFlowFormNonInputElementType,
} from "../../../../types/enums";
import styles from "./preview.module.css";
import { WaFlowFormElement } from "../../../../types/global";

export function FlowTextPreview({
  text,
  type,
}: {
  text: string;
  type: WaFlowFormNonInputElementType;
}) {
  return <span className={styles[type]}>{text}</span>;
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
        {options.map((option, index) => (
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
        {options.map((option, index) => (
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
export function FlowPreviewContainer({ children, onClose, style }) {
  return (
    <Stack
      style={{
        backgroundColor: "white",
        borderRadius: "12px 12px 0px 0px",
        padding: "0px 4px 8px 4px",
        height: "90%",
        ...style,
      }}
      gap={0}
    >
      {FlowContainerHeader(onClose)}
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
        Next {/* TODO: make footer button customizable */}
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
    case WaFlowFormElementType.textBody:
    case WaFlowFormElementType.textCaption:
    case WaFlowFormElementType.textSubHeading:
      return <FlowTextPreview text={fe.text} type={fe.type as any} />;

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
          options={fe["data-source"].map((ds) => ds.title)}
        />
      );
    case WaFlowFormElementType.checkboxGroup:
      return (
        <FlowCheckBoxPreview
          label={fe.label}
          options={fe["data-source"].map((ds) => ds.title)}
        />
      );
    case WaFlowFormElementType.dropDown:
      return (
        <DropDownPreview
          label={fe.label}
          options={fe["data-source"].map((ds) => ds.title)}
        />
      );
    case WaFlowFormElementType.optIn:
      return <FlowOptInPreview label={fe.label} />;
    case WaFlowFormElementType.image:
      return (
        <FlowImagePreview src={fe.src} width={fe.width} height={fe.height} />
      );
    default:
      throw new Error("Invalid form element type");
  }
}
