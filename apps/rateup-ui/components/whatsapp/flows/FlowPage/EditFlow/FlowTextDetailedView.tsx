import {
  Divider,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Switch,
  TextareaProps,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconDeviceSdCard } from "@tabler/icons-react";
import { useContext, useState } from "react";
import {
  WaFlowFormElementType,
  WhatsappFlowFontWeight,
} from "../../../../../types/enums";
import { SAVE_HOTKEY } from "../../../../../utils/constants";
import { showErrorToast } from "../../../../../utils/notifications";
import {
  getFlowFormElementById,
  getFlowTextLimit,
  getFormObjFromScreenId,
} from "../../../../../utils/whatsapp/flow.utils";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { TextareaWithLengthTracker } from "../../../../Survey/ShareSurvey/FlowShareTemplateEditor";
import { ContainedSelection } from "../../../../input/ContainedInput/ContainedInput";
import { EditFlowContext } from "./EditFlowContext";

export function FlowTextDetailedView() {
  const { selectedFormElementId, flowJson, updateFlowJson, selectedScreenId } =
    useContext(EditFlowContext);
  const selectedFormElement = getFlowFormElementById(
    selectedFormElementId,
    flowJson,
  );
  const [nonInputTextType, setNonInputTextType] = useState(
    selectedFormElement.type === WaFlowFormElementType.nonInputText
      ? WaFlowFormElementType.textHeading
      : selectedFormElement.type,
  );
  const form = useForm({
    initialValues: {
      text: selectedFormElement.text || "",
      type: nonInputTextType,
      fontWeight: selectedFormElement["font-weight"] || "normal",
      strikethrough: selectedFormElement.strikethrough || false,
    },
    validate: {
      text: (value) => {
        const limit = getFlowTextLimit(nonInputTextType);
        if (!value) return "Text is required";
        if (value.length > limit) {
          return `Text should be less than ${limit} characters`;
        }
      },
    },
  });
  const textDecoration = [
    WaFlowFormElementType.textBody,
    WaFlowFormElementType.textCaption,
  ].includes(nonInputTextType);

  function handleSaveElement() {
    const res = form.validate();
    if (res.hasErrors) {
      showErrorToast("Fix errors before saving");
      return "error";
    } else {
      const flowForm = getFormObjFromScreenId(
        flowJson.screens,
        selectedScreenId,
      );
      const index = flowForm.children.findIndex(
        (fe) => fe === selectedFormElement,
      );
      updateFlowJson((draft) => {
        const formEl = getFormObjFromScreenId(draft.screens, selectedScreenId);
        formEl.children[index].text = form.values.text;
        if (textDecoration) {
          formEl.children[index]["font-weight"] = form.values.fontWeight;
          formEl.children[index].strikethrough = form.values.strikethrough;
        } else {
          delete formEl.children[index]["font-weight"];
          delete formEl.children[index].strikethrough;
        }
        formEl.children[index].type = nonInputTextType;
      });
    }
  }
  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      justify="space-between"
    >
      <ScrollArea h={"80%"}>
        <Group justify="space-between">
          <ContainedSelection
            data={[
              {
                value: WaFlowFormElementType.textHeading,
                label: "Large Heading",
              },
              {
                value: WaFlowFormElementType.textSubHeading,
                label: "Sub Heading",
              },
              { value: WaFlowFormElementType.textBody, label: "Body" },
              {
                value: WaFlowFormElementType.textCaption,
                label: "Caption",
              },
            ]}
            placeholder="Select text type"
            value={nonInputTextType}
            onChange={(e) => setNonInputTextType(e as any)}
            allowDeselect={false}
          />
        </Group>
        <Group p={2} gap={2} pr={42}>
          <Stack
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "clip",
              flex: 1,
            }}
            gap={0}
            p={"sm"}
          >
            <Group display={textDecoration ? "flex" : "none"}>
              <Radio.Group
                name="favoriteFramework"
                withAsterisk
                {...form.getInputProps("fontWeight")}
              >
                <Group mt="xs">
                  <Radio
                    value={WhatsappFlowFontWeight.bold}
                    label="Bold"
                    size="xs"
                  />
                  <Radio
                    value={WhatsappFlowFontWeight.italic}
                    label="Italics"
                    size="xs"
                  />
                  <Radio
                    value={WhatsappFlowFontWeight.boldAndItalic}
                    label="Bold and italic"
                  />
                  <Radio
                    value={WhatsappFlowFontWeight.normal}
                    label="Normal"
                    size="xs"
                  />
                </Group>
              </Radio.Group>
              <Switch
                label="Strike Through"
                {...form.getInputProps("strikethrough")}
                defaultChecked={form.values?.strikethrough}
                size="xs"
                mt={"xs"}
              />
            </Group>
            <FlowTextElementEditor
              {...form.getInputProps("text")}
              maxValue={getFlowTextLimit(nonInputTextType)}
              onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSaveElement]])}
              style={{
                ...getTextStyle(form.values?.fontWeight, textDecoration),
                textDecoration:
                  textDecoration && form.values?.strikethrough
                    ? "line-through"
                    : "none",
              }}
              fontNormal={textDecoration}
            />
          </Stack>
        </Group>
      </ScrollArea>

      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <RateupButtonPrimary
            title={"Save"}
            size="md"
            leftIcon={<IconDeviceSdCard />}
            onClick={handleSaveElement}
          />
        </Group>
      </Stack>
    </Stack>
  );
}

function FlowTextElementEditor(
  props: TextareaProps & {
    value?: string;
    maxValue: number;
    fontNormal: boolean;
  },
) {
  const { fontNormal, ...otherProp } = props;
  return (
    <TextareaWithLengthTracker
      fz="lg"
      styles={{
        input: {
          fontSize: "1.75rem",
          fontWeight: props.fontNormal ? "inherit" : 800,
        },
      }}
      style={{
        marginBottom: "20px", // add 30px bottom margin
      }}
      variant="unstyled"
      autosize
      placeholder="Enter your text here *"
      {...otherProp}
    />
  );
}

export const getTextStyle = (style: string, type: boolean): {} => {
  let response = {};
  if (!type) return response;
  switch (style) {
    case WhatsappFlowFontWeight.bold:
      response = { fontWeight: "bold" };
      break;
    case WhatsappFlowFontWeight.italic:
      response = { fontStyle: "italic" };
      break;
    case WhatsappFlowFontWeight.boldAndItalic:
      response = { fontWeight: "bold", fontStyle: "italic" };
      break;
    default:
      break;
  }
  return response;
};
