import {
  Grid,
  Container,
  Stack,
  Group,
  Button,
  Text,
  Modal,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  ResponseMessageContainer,
  QuickReplyButton,
} from "../MessageComponents";
import {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
} from "../../../backend/whatsapp/whatsapp.query";
import { useEffect, useState } from "react";
import { parseTemplate } from "../../../utils/whatsapp/templates";
import { WaTemplateStatus } from "../../../types/enums";
import { showWarnToast } from "../../../utils/notifications";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import inputStyles from "../../../components/input/InputStyles.module.css";
import { LengthTracker } from "../../input/LengthTracker";

export function CreateWaTemplateModal({ opened, onClose, editingItem }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parsedTemplate = editingItem ? parseTemplate(editingItem) : null;
  const form = useForm({
    initialValues: parsedTemplate
      ? parsedTemplate
      : {
          name: "",
          header: "",
          body: "Would you like to start survey?",
          footer: "",
          declineButton: "No",
          acceptButton: "Yes",
        },
    validate: {
      name: (value) => {
        if (value.trim().length === 0 || value.trim().length > 512) {
          return null;
        } else if (value.includes(" ")) {
          return "Name cannot contain spaces. Replace it with underscore(_)";
        } else if (/[A-Z]/.test(value)) {
          return "Name cannot contain uppercase letters";
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
        showWarnToast("Cannot edit pending template. Please wait for approval");
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
        <Text fz="xl">{editingItem ? "Edit Template" : "Create Template"}</Text>
      </Modal.Header>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Grid align="stretch">
          <Grid.Col span={6} className={inputStyles.lengthTrackerParent}>
            <ContainedTextField
              label="Name"
              placeholder="Name"
              {...form.getInputProps("name")}
              rightSection={
                <LengthTracker string={form.values.name} maxValue={512} />
              }
              disabled={!!editingItem}
            />
            <ContainedTextField
              label="Header"
              placeholder="Header"
              {...form.getInputProps("header")}
              rightSection={
                <LengthTracker string={form.values.header} maxValue={60} />
              }
            />
            <ContainedTextArea
              label="Body"
              placeholder="Body"
              withAsterisk
              autosize
              minRows={2}
              maxRows={4}
              {...form.getInputProps("body")}
              rightSection={
                <LengthTracker string={form.values.body} maxValue={1024} />
              }
            />
            <ContainedTextField
              label="Footer"
              placeholder="Footer"
              {...form.getInputProps("footer")}
              rightSection={
                <LengthTracker string={form.values.footer} maxValue={60} />
              }
            />
            <ContainedTextField
              label="Decline Button (Does nothing)"
              withAsterisk
              {...form.getInputProps("declineButton")}
              rightSection={
                <LengthTracker
                  string={form.values.declineButton}
                  maxValue={25}
                />
              }
            />
            <ContainedTextField
              label="Accept Button (Starts survey on clicking)"
              withAsterisk
              {...form.getInputProps("acceptButton")}
              rightSection={
                <LengthTracker
                  string={form.values.acceptButton}
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
            {editingItem ? "Save" : "Create"}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
