"use client";

import { useEffect, useState } from "react";

import {
  Button,
  Container,
  Grid,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
} from "../../../backend/whatsapp/whatsapp.query";
import inputStyles from "../../../components/input/InputStyles.module.css";
import { WaTemplateStatus } from "../../../types/enums";
import { SAVE_HOTKEY } from "../../../utils/constants";
import { parseTemplate } from "../../../utils/whatsapp/templates";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../input/LengthTracker";
import {
  QuickReplyButton,
  ResponseMessageContainer,
} from "../MessageComponents";

export function CreateWaTemplateModal({ opened, onClose, editingItem }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parsedTemplate = editingItem ? parseTemplate(editingItem) : null;
  const translations = useExtracted();
  const form = useForm({
    initialValues: parsedTemplate
      ? parsedTemplate
      : {
          name: "",
          header: "",
          body: translations("Would you like to start survey?"),
          footer: "",
          declineButton: "No",
          acceptButton: "Yes",
        },
    validate: {
      name: (value) => {
        if (value.trim().length === 0 || value.trim().length > 512) {
          return null;
        } else if (value.includes(" ")) {
          return translations(
            "Name cannot contain spaces. Replace it with underscore(_)",
          );
        } else if (/[A-Z]/.test(value)) {
          return translations("Name cannot contain uppercase letters");
        }
      },
      header: (value) => value.trim().length > 60,
      body: (value) => value.trim().length > 1024 && !(value.trim().length > 0),
      footer: (value) => value.trim().length > 60,
      declineButton: (value) =>
        value.trim().length > 25 && !(value.trim().length > 0),
      acceptButton: (value) =>
        value.trim().length < 25 && !(value.trim().length > 0),
    },
  });

  useEffect(() => {
    if (parsedTemplate) {
      form.setValues(parsedTemplate);
    }
  }, [editingItem]);

  const createTemplateMutation = useCreateTemplateMutation(
    () => {
      form.reset();
      onClose();
      setIsSubmitting(false);
    },
    () => {
      setIsSubmitting(false);
    },
  );

  const updateTemplateMutation = useUpdateTemplateMutation(
    () => {
      form.reset();
      onClose();
      setIsSubmitting(false);
    },
    () => {
      setIsSubmitting(false);
    },
  );

  function handleSubmit(values) {
    setIsSubmitting(true);
    if (editingItem) {
      if (editingItem.data.status === WaTemplateStatus.PENDING) {
        toast.warning(
          translations(
            "Cannot edit pending template. Please wait for approval",
          ),
        );
        setIsSubmitting(false);
        return;
      }
      updateTemplateMutation.mutate({
        templateId: editingItem.id,
        templateData: values,
      });
    } else {
      createTemplateMutation.mutate(values);
    }
  }
  function handleClose() {
    onClose();
    form.reset();
  }
  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="800px"
      centered
      padding={"sm"}
    >
      <Modal.Header>
        <Text fz="xl">
          {editingItem
            ? translations("Edit Template")
            : translations("Create Template")}
        </Text>
      </Modal.Header>
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
        ])}
      >
        <Grid align="stretch">
          <Grid.Col span={6} className={inputStyles.lengthTrackerParent}>
            <ContainedTextField
              label={translations("Name")}
              placeholder={translations("Name")}
              {...form.getInputProps("name")}
              rightSection={
                <LengthTracker
                  length={form.values.name.length}
                  maxValue={512}
                />
              }
              disabled={!!editingItem}
            />
            <ContainedTextField
              label={translations("Header")}
              placeholder={translations("Header")}
              {...form.getInputProps("header")}
              rightSection={
                <LengthTracker
                  length={form.values.header.length}
                  maxValue={60}
                />
              }
            />
            <ContainedTextArea
              label={translations("Body")}
              placeholder={translations("Body")}
              withAsterisk
              autosize
              minRows={2}
              maxRows={4}
              {...form.getInputProps("body")}
              rightSection={
                <LengthTracker
                  length={form.values.body.length}
                  maxValue={1024}
                />
              }
            />
            <ContainedTextField
              label={translations("Footer")}
              placeholder={translations("Footer")}
              {...form.getInputProps("footer")}
              rightSection={
                <LengthTracker
                  length={form.values.footer.length}
                  maxValue={60}
                />
              }
            />
            <ContainedTextField
              label={translations("Decline Button (Does nothing)")}
              withAsterisk
              {...form.getInputProps("declineButton")}
              rightSection={
                <LengthTracker
                  length={form.values.declineButton.length}
                  maxValue={25}
                />
              }
            />
            <ContainedTextField
              label={translations("Accept Button (Starts survey on clicking)")}
              withAsterisk
              {...form.getInputProps("acceptButton")}
              rightSection={
                <LengthTracker
                  length={form.values.acceptButton.length}
                  maxValue={25}
                />
              }
            />
          </Grid.Col>
          <Grid.Col
            span={6}
            display={"flex"}
            style={{
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Text fz="lg">Preview</Text>
            <Container
              style={{
                backgroundColor: "#efeae2",
                borderRadius: "8px",
                flexGrow: 1,
              }}
              p="xl"
            >
              <Stack w="300px" gap={3}>
                <ResponseMessageContainer>
                  <Text
                    fw="bold"
                    style={{
                      color: "#444",
                    }}
                  >
                    {form.values.header}
                  </Text>
                  <Text fz={"0.95rem"}>{form.values.body}</Text>
                  <Text c="dimmed" fz={"0.9rem"}>
                    {form.values.footer}
                  </Text>
                </ResponseMessageContainer>
                <QuickReplyButton text={form.values.declineButton} />
                <QuickReplyButton text={form.values.acceptButton} />
              </Stack>
            </Container>
          </Grid.Col>
        </Grid>
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editingItem ? translations("Save") : translations("Create")}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
