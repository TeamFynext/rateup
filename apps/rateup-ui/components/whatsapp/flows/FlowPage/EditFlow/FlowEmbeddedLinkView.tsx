import {
  Badge,
  Divider,
  Group,
  ScrollArea,
  Stack,
  TextareaProps,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconDeviceSdCard } from "@tabler/icons-react";
import { useContext, useState } from "react";
import { WaFlowFormElementType } from "../../../../../types/enums";
import { SAVE_HOTKEY } from "../../../../../utils/constants";
import { getWaFlowFormElementTypeLabel } from "../../../../../utils/enums";
import { showErrorToast } from "../../../../../utils/notifications";
import {
  getFlowFormElementById,
  getFlowTextLimit,
  getFormObjFromScreenId,
} from "../../../../../utils/whatsapp/flow.utils";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { TextareaWithLengthTracker } from "../../../../Survey/ShareSurvey/FlowShareTemplateEditor";
import { EditFlowContext } from "./EditFlowContext";

export function FlowEmbeddedLinkDetailedView() {
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
    },
    validate: {
      text: (value) => {
        const limit = getFlowTextLimit(selectedFormElement.type);
        if (!value.trim()) return "Text is required";
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
        formEl.children[index]["on-click-action"] = {
          name: "navigate",
          next: {
            type: "screen",
            name: "FINISH",
          },
          payload: {
            test_payload: "This is a test_payload",
          },
        };
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
          <Badge variant="outline" size="lg" color="gray">
            {getWaFlowFormElementTypeLabel(selectedFormElement.type)}
          </Badge>
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
            <FlowTextElementEditor
              {...form.getInputProps("text")}
              maxValue={getFlowTextLimit(nonInputTextType)}
              onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSaveElement]])}
              fontNormal={false}
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
