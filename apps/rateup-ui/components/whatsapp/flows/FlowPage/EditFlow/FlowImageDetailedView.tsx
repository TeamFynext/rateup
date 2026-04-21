"use client";

import { useContext, useEffect, useState } from "react";

import {
  Badge,
  Button,
  Divider,
  FileButton,
  Group,
  Image,
  NumberInput,
  ScrollAreaAutosize,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceSdCard } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import { getWaFlowFormElementTypeLabel } from "../../../../../utils/enums";
import { fileToBase64 } from "../../../../../utils/misc/base64.utils";
import {
  getFlowFormElementById,
  getFormObjFromScreenId,
} from "../../../../../utils/whatsapp/flow.utils";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { EditFlowContext } from "./EditFlowContext";

export function FlowImageDetailedView() {
  const { selectedFormElementId, flowJson, updateFlowJson, selectedScreenId } =
    useContext(EditFlowContext);
  const selectedFormElement = getFlowFormElementById(
    selectedFormElementId,
    flowJson,
  );

  const form = useForm({
    initialValues: {
      type: selectedFormElement.type,
      id: selectedFormElement.id,
      "scale-type": "cover",
      src: "",
      height: selectedFormElement.height || 200,
      width: selectedFormElement.width || 300,
    },
    validate: {
      src: (value) => (value?.length ? null : "Upload image to save"),
    },
  });
  const translations = useExtracted();
  // TODO: figure out why this can't be set in initialValues above
  // init
  useEffect(() => {
    if (!form.values.src) {
      form.setFieldValue("src", selectedFormElement.src);
      form.setFieldValue("height", selectedFormElement.height || 200);
      form.setFieldValue("width", selectedFormElement.width || 300);
    }
  }, [selectedFormElement]);

  function handleChange(updatedData: any) {
    form.setValues({
      ...form.values,
      ...updatedData,
    });
  }
  function handleSaveElement() {
    const { hasErrors } = form.validate();
    if (hasErrors) return toast.error(translations("Unable to Save Image"));
    const flowForm = getFormObjFromScreenId(flowJson.screens, selectedScreenId);
    const index = flowForm.children.findIndex(
      (fe) => fe === selectedFormElement,
    );
    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, selectedScreenId);
      formEl.children[index] = form.values as any;
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
      <ScrollAreaAutosize mah={"65dvh"}>
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
            <FlowImageElementEditor
              onChange={handleChange}
              height={form.values.height}
              width={form.values.width}
              src={form.values.src}
            />
          </Stack>
        </Group>
      </ScrollAreaAutosize>

      <Stack>
        <Divider />
        <Group justify="flex-end" p="xs" px={"sm"}>
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

// currently not allowing user to edit width
function FlowImageElementEditor({ onChange, src, height, width }) {
  const [file, setFile] = useState<File | null>(null);
  const [base64, setBase64] = useState("");
  const translations = useExtracted();
  useEffect(() => {
    onChange({
      src: base64.split(",")[1],
    });
  }, [base64]);

  useEffect(() => {
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error(translations("Size must be under 300kb"));
      return;
    }

    (async () => {
      const base64 = await fileToBase64(file);
      setBase64(base64);
    })();
  }, [file]);

  return (
    <Stack>
      <FileButton onChange={setFile} accept="image/png,image/jpeg,image/jpg">
        {(props) => (
          <Button {...props}>
            {file ? translations("Change Image") : translations("Upload image")}
          </Button>
        )}
      </FileButton>
      {src && (
        <>
          <Image
            src={`data:image/jpg;base64,${src}`}
            h={height}
            w={width - 100}
            mah={height}
            alt="flow Image"
          />
          <NumberInput
            label={translations("Width")}
            min={100}
            max={400}
            value={width}
            onChange={(width) => onChange({ width })}
          />
          <NumberInput
            label={translations("Height")}
            min={100}
            max={600}
            value={height}
            onChange={(height) => onChange({ height })}
          />
        </>
      )}
    </Stack>
  );
}
