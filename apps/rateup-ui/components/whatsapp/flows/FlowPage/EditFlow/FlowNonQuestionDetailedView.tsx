import {
  Stack,
  Divider,
  Group,
  Textarea,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceSdCard } from "@tabler/icons-react";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { getWaFlowFormElementTypeLabel } from "../../../../../utils/enums";
import { useContext } from "react";
import { EditFlowContext } from "./EditFlowContext";
import {
  getFlowFormElementById,
  getFlowTextLimit,
} from "../../../../../utils/whatsapp/flow.utils";
import { getFormObjFromScreenId } from "../../../../../utils/whatsapp/flow.utils";

export function FlowNonQuestionDetailedView() {
  const {
    selectedFormElementId,
    setSelectedFormElementId,
    flowJson,
    updateFlowJson,
    selectedScreenId,
  } = useContext(EditFlowContext);
  const selectedFormElement = getFlowFormElementById(
    selectedFormElementId,
    flowJson,
  );

  const form = useForm({
    initialValues: {
      text: selectedFormElement.text || "",
      type: selectedFormElement.type,
    },
    validate: {
      text: (value) => {
        const limit = getFlowTextLimit(selectedFormElement.type);
        if (!value) return "Text is required";
        if (value.length > limit) {
          return `Text should be less than ${limit} characters`;
        }
      },
    },
  });

  function handleSaveElement() {
    const formEl = getFormObjFromScreenId(flowJson.screens, selectedScreenId);
    const index = formEl.children.findIndex((fe) => fe === selectedFormElement);

    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, selectedScreenId);
      formEl.children[index].text = form.values.text;
    });
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
            <Textarea
              fw={800}
              fz="lg"
              styles={{
                input: {
                  fontSize: "1.75rem",
                  fontWeight: 700, // set custom font size for this TextInput
                },
              }}
              style={{
                marginBottom: "20px", // add 30px bottom margin
              }}
              variant="unstyled"
              autosize
              placeholder="Enter your text here *"
              {...form.getInputProps("text")}
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
