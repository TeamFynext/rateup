import { useContext, useState } from "react";

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

import useTranslations from "@/dictionaries/useTranslation";

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
import { ContainedSelection } from "../../../../input/ContainedInput/ContainedInput";
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
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: {
      text: selectedFormElement.text || "",
      type: nonInputTextType,
      embeddedLinkScreenId: "",
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
      showErrorToast(translations["Fix errors before saving"]);
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
        const footer = formEl.children?.find(
          (data) => data.type === WaFlowFormElementType.footer,
        );

        formEl.children[index].text = form.values.text;
        formEl.children[index]["on-click-action"] = {
          name: "navigate",
          next: {
            type: "screen",
            name: form.values.embeddedLinkScreenId,
          },
          payload: footer?.["on-click-action"]?.payload ?? {
            test_payload: "This is a test_payload",
          },
        };
      });
    }
  }
  const currentIndex = flowJson.screens.findIndex(
    (s) => s.id === selectedScreenId,
  );
  const nextScreens = flowJson.screens.slice(currentIndex + 1);

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
            <ContainedSelection
              data={nextScreens?.map((data) => ({
                label: data?.title,
                value: data?.id,
              }))}
              {...form.getInputProps("embeddedLinkScreenId")}
              label={"Next screen"}
              placeholder={translations["select next screen"]}
              w={300}
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
  const { translations } = useTranslations();
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
      placeholder={translations["Enter your text here *"]}
      {...otherProp}
    />
  );
}
