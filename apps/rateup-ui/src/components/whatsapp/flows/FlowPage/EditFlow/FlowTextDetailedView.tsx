"use client";

import { useContext, useEffect, useState } from "react";

import type { TextareaProps } from "@mantine/core";
import {
  Divider,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Switch,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconDeviceSdCard } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { WaFlowFormElementType, WhatsappFlowFontWeight } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import {
  getFlowFormElementById,
  getFlowTextLimit,
  getFormObjFromScreenId,
} from "@/utils/whatsapp/flow.utils";

import { RateupButtonPrimary } from "../../../../Button/RateupButtons.tsx";
import { ContainedSelection } from "../../../../input/ContainedInput/ContainedInput.tsx";
import { TextareaWithLengthTracker } from "../../../../Survey/ShareSurvey/FlowShareTemplateEditor.tsx";
import { EditFlowContext } from "./EditFlowContext.ts";

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
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (form.isValid()) handleSaveElement();
  }, [form.values]);

  const textDecoration = [
    WaFlowFormElementType.textBody,
    WaFlowFormElementType.textCaption,
  ].includes(nonInputTextType);

  function handleSaveElement() {
    const res = form.validate();
    if (res.hasErrors) {
      toast.error(translations("Fix errors before saving"));
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
                label: translations("Large Heading"),
              },
              {
                value: WaFlowFormElementType.textSubHeading,
                label: translations("Sub Heading"),
              },
              {
                value: WaFlowFormElementType.textBody,
                label: translations("Body"),
              },
              {
                value: WaFlowFormElementType.textCaption,
                label: translations("Caption"),
              },
            ]}
            placeholder={translations("Select text type")}
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
                    label={translations("Bold")}
                    size="xs"
                  />
                  <Radio
                    value={WhatsappFlowFontWeight.italic}
                    label={translations("Italics")}
                    size="xs"
                  />
                  <Radio
                    value={WhatsappFlowFontWeight.boldAndItalic}
                    label={translations("Bold and italic")}
                  />
                  <Radio
                    value={WhatsappFlowFontWeight.normal}
                    label={translations("Normal")}
                    size="xs"
                  />
                </Group>
              </Radio.Group>
              <Switch
                label={translations("Strike Through")}
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
              fontSize={textFontSize[nonInputTextType]}
            />
          </Stack>
        </Group>
      </ScrollArea>
      <Stack>
        <Divider />
        <Group justify="flex-end" p="xs" px={"sm"}>
          <RateupButtonPrimary
            title={translations("Save")}
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
    fontSize: string;
  },
) {
  const { fontNormal, fontSize, ...otherProp } = props;
  const { t: translations } = useTranslation();
  return (
    <TextareaWithLengthTracker
      fz={fontSize}
      styles={{
        input: {
          fontSize: fontSize,
          fontWeight: props.fontNormal ? "inherit" : 800,
        },
      }}
      style={{
        marginBottom: "20px", // add 30px bottom margin
      }}
      variant="unstyled"
      autosize
      placeholder={translations("Enter your text here *")}
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

const textFontSize = {
  [WaFlowFormElementType.textHeading]: "22px",
  [WaFlowFormElementType.textSubHeading]: "20px",
  [WaFlowFormElementType.textBody]: "18px",
  [WaFlowFormElementType.textCaption]: "16px",
};
