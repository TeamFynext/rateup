import { useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Card,
  Flex,
  Grid,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { useRouter } from "next/router";

import { IconX } from "@tabler/icons-react";
import { uploadTemplateMedia } from "../../../../backend/whatsapp/whatsapp.api";
import {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useWaTemplateById,
} from "../../../../backend/whatsapp/whatsapp.query";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../../../components/input/LengthTracker";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import {
  QuickReplyButton,
  ResponseMessageContainer,
} from "../../../../components/whatsapp/MessageComponents";
import { BroadCastTypeValue } from "../../../../components/whatsapp/templates/Details/BroadCastTypeValue";
import { ButtonSelection } from "../../../../components/whatsapp/templates/Details/ButtonSelectionMenu";
import { HeaderWithFormatting } from "../../../../components/whatsapp/templates/Details/HeaderWithFormating";
import { TextFormateToolBar } from "../../../../components/whatsapp/templates/Details/TextFormateToolBar";
import TextWithFormatting from "../../../../components/whatsapp/templates/Details/TextWithFormating";
import WaChatPreview from "../../../../components/whatsapp/templates/WaChatPreview";
import { WaTemplateStatus } from "../../../../types/enums";
import {
  MAX_FILE_SIZE_IN_BYTE,
  SAVE_HOTKEY,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
  WHATSAPP_TEMPLATE_CATEGORY,
} from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";
import { showErrorToast, showWarnToast } from "../../../../utils/notifications";
import { parseTemplate } from "../../../../utils/whatsapp/templates";

export default function WhatsappTemplateById() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  let templateId = router.query.templateId as string;
  templateId = templateId === "create" ? "" : templateId;
  const { data: editingItem, isPending } = useWaTemplateById(templateId);
  const [selectedText, setSelectedText] = useState("");
  const contentHistory = useRef([]); // Ref to store content history
  const inputRef = useRef(null);

  const form = useForm({
    initialValues: {
      name: "",
      header: null,
      body: "Would you like to start survey?",
      footer: "",
      category: "MARKETING",
      format: "NONE",
      buttons: [],
    },
    validate: {
      name: (value) => {
        if (value.trim().length === 1 || value.trim().length > 512) {
          return null;
        } else if (value.includes(" ")) {
          return "Name cannot contain spaces. Replace it with underscore(_)";
        } else if (/[A-Z]/.test(value)) {
          return "Name cannot contain uppercase letters";
        } else if (value.trim().length === 0) {
          return "Name Required";
        }
      },
      header: (value: string | File | null, values) => {
        if (
          values.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[2] &&
          typeof value !== "string"
        ) {
          return (
            !["image/png", "image/jpg", "image/jpeg"].includes(value?.type) &&
            "Incorrect Type"
          );
        } else if (
          values.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[3] &&
          typeof value !== "string"
        ) {
          return !["video/mp4"].includes(value?.type) && "Incorrect Type";
        } else if (
          values.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[4] &&
          typeof value !== "string"
        ) {
          return !["application/pdf"].includes(value?.type) && "Incorrect Type";
        } else if (
          typeof value === "string" &&
          values.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[1]
        ) {
          return value.trim().length > 60 && "max text size is 60";
        } else if (
          value instanceof File &&
          values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE[0] &&
          values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE[1] &&
          values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE[5]
        ) {
          return value.size > MAX_FILE_SIZE_IN_BYTE && "Max file size is 10 MB";
        }
      },
      body: (value) => value.trim().length > 1024 && value.trim().length <= 0,
      footer: (value) => value.trim().length > 60,
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.setValues(parseTemplate(editingItem));
    }
  }, [editingItem]);

  const createTemplateMutation = useCreateTemplateMutation(
    () => {
      form.reset();
      setIsSubmitting(false);
      router.push("/dashboard/whatsapp/templates/");
    },
    () => {
      setIsSubmitting(false);
    },
  );

  const updateTemplateMutation = useUpdateTemplateMutation(
    templateId,
    () => {
      form.reset();
      setIsSubmitting(false);
    },
    () => {
      setIsSubmitting(false);
    },
  );
  if (templateId && isPending) return <RateupLoader />;

  async function handleSubmit(values: typeof form.values) {
    const buttonArray = values.buttons?.filter(
      (data) => data?.text?.trim().length > 24,
    );
    if (buttonArray?.length > 0) {
      showErrorToast(`Max length of text in button should be 25`);
      return;
    } else if (values?.buttons?.length > 12) {
      showErrorToast(`Max number of button in buttons should be 12`);
      return;
    }
    try {
      setIsSubmitting(true);
      if (
        values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE[0] &&
        values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE[5] &&
        values.header instanceof File
      ) {
        const file = await uploadTemplateMedia(values.header);
        values.header = file?.id ?? "";
      }
      if (editingItem) {
        if (editingItem.data.status === WaTemplateStatus.PENDING) {
          showWarnToast(
            "Cannot edit pending template. Please wait for approval",
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
    } catch (error) {
      setIsSubmitting(false);
      showErrorToast(
        typeof error === "string"
          ? error
          : typeof error.message === "string"
            ? error.message
            : "error in uploading",
      );
    }
  }
  const handleSelect = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    setSelectedText(selectedText?.trim());
  };
  const applyFormatting = (style) => {
    if (!selectedText) return;
    const formattedText = `${style}${selectedText}${style}`;
    let content = form.values.body;
    contentHistory.current.push(content);
    const newContent = content.replace(selectedText, formattedText);
    form.setFieldValue("body", newContent);
  };

  const undo = () => {
    if (contentHistory.current.length > 0) {
      const previousContent = contentHistory.current.pop();
      form.setFieldValue("body", previousContent);
    }
  };

  const insertValue = (value: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + value + text.substring(end);
    form.setFieldValue("body", newText);
    const newCursorPosition = start + value.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
  };
  const handleMenuSelection = (e: string) => {
    const newObject = { type: e, text: "" };
    form.setValues((prevValues) => ({
      ...prevValues,
      buttons: [...prevValues.buttons, newObject],
    }));
  };
  const deleteButton = (index: number) => {
    form.setValues((prevValues) => ({
      ...prevValues,
      buttons: prevValues.buttons.filter((btn, i) => i !== index),
    }));
  };
  return (
    <form
      onSubmit={form.onSubmit(handleSubmit)}
      onKeyDown={getHotkeyHandler([
        [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
      ])}
    >
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
      >
        <Title order={1} c={"var(--grey-color)"} tt={"capitalize"}>
          {editingItem ? editingItem?.data?.name : "Create Template"}
        </Title>

        <Flex
          mih={50}
          gap="4"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <RateupButtonBlue
            title="Save & Submit"
            loading={isSubmitting}
            type={"submit"}
          />
        </Flex>
      </Flex>
      <Grid align="stretch">
        <Grid.Col span={9}>
          <PaperLayout p={"xl"} h={"80dvh"}>
            <Stack gap={"xs"}>
              <ContainedTextField
                label={
                  <Text fz={14} ff={lexend500.style.fontFamily}>
                    Template Name
                  </Text>
                }
                placeholder="Name"
                {...form.getInputProps("name")}
                rightSection={
                  <LengthTracker
                    length={form.values.name.length}
                    maxValue={512}
                    atStart
                  />
                }
                disabled={!!editingItem}
              />
              <ContainedSelection
                label={
                  <Text fz={14} ff={lexend500.style.fontFamily}>
                    Category
                  </Text>
                }
                placeholder="Category"
                {...form.getInputProps("category")}
                data={WHATSAPP_TEMPLATE_CATEGORY}
                allowDeselect={false}
              />
              <Grid>
                <Grid.Col span={4}>
                  <ContainedSelection
                    label={
                      <>
                        <Text fz={14} ff={lexend500.style.fontFamily}>
                          Broadcast header
                        </Text>
                        <Text fz={10}>
                          Highlight your brand here, use images or videos, to
                          stand out
                        </Text>
                      </>
                    }
                    placeholder="Broadcast Type"
                    {...form.getInputProps("format")}
                    data={WHATSAPP_TEMPLATE_BROADCAST_TYPE}
                    allowDeselect={false}
                  />
                </Grid.Col>
                <Grid.Col span={"auto"}>
                  <Stack
                    h={"100%"}
                    justify="center"
                    w={form.values?.format === "TEXT" ? "100%" : 300}
                  >
                    <BroadCastTypeValue
                      form={form}
                      type={form.values?.format}
                    />
                  </Stack>
                </Grid.Col>
              </Grid>
              <Textarea
                ref={inputRef}
                label={
                  <>
                    <Text fz={14} ff={lexend500.style.fontFamily}>
                      Body
                    </Text>
                    <Text fz={10}>
                      Make your messages personal using variables and get more
                      replies!
                    </Text>
                  </>
                }
                description={
                  <TextFormateToolBar
                    applyFormatting={applyFormatting}
                    insertValue={insertValue}
                    undo={undo}
                  />
                }
                styles={{
                  input: {
                    borderRadius: "0px 0px 12px 12px",
                  },
                }}
                placeholder={`Enter the text`}
                autosize
                minRows={3}
                maxRows={3}
                onSelect={handleSelect}
                {...form.getInputProps("body")}
              />
              <ContainedTextField
                label={
                  <>
                    <Text fz={14} ff={lexend500.style.fontFamily}>
                      Footer (Optional)
                    </Text>
                    <Text fz={10}>
                      Footers are great to add any disclaimers or to add a
                      thoughtful PS
                    </Text>
                  </>
                }
                placeholder="Footer"
                {...form.getInputProps("footer")}
                rightSection={
                  <LengthTracker
                    length={form.values.footer.length}
                    maxValue={60}
                    atStart
                  />
                }
              />
              <ButtonSelection handleMenuSelection={handleMenuSelection} />
              {form.values?.buttons?.length > 0 && (
                <>
                  {form.values?.buttons?.map((data, index) => (
                    <Group key={index}>
                      <ContainedTextField
                        label={
                          <Text fz={14} ff={lexend500.style.fontFamily}>
                            Button text
                          </Text>
                        }
                        rightSection={
                          <LengthTracker
                            length={form.values?.buttons?.[index]?.text?.length}
                            maxValue={25}
                            atStart
                          />
                        }
                        w={"90%"}
                        {...form.getInputProps(`buttons.${index}.text`)}
                      />
                      <ActionIcon
                        mt={24}
                        variant="transparent"
                        onClick={() => deleteButton(index)}
                      >
                        <IconX />
                      </ActionIcon>
                    </Group>
                  ))}
                </>
              )}
            </Stack>
          </PaperLayout>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder h={"min(80dvh,660px)"} radius={"lg"}>
            <Stack h={"100%"} align="center" gap={0}>
              <Text fz="24px" ff={lexend500.style.fontFamily}>
                Preview
              </Text>
              <WaChatPreview>
                <Stack miw="200px" gap={3} p={"md"}>
                  <ResponseMessageContainer>
                    <Text
                      fw="bold"
                      style={{
                        color: "#444",
                      }}
                    >
                      {HeaderWithFormatting(
                        form.values?.header,
                        form.values?.format,
                      )}
                    </Text>
                    <Text fz={"0.95rem"}>
                      {TextWithFormatting(form.values.body)}
                    </Text>
                    <Text c="dimmed" fz={"0.9rem"}>
                      {form.values.footer}
                    </Text>
                  </ResponseMessageContainer>
                  {form.values?.buttons
                    ?.slice(0, 2)
                    .map((data) => (
                      <QuickReplyButton text={data?.text} key={data?.text} />
                    ))}
                  {form.values?.buttons?.length > 2 && (
                    <QuickReplyButton text={"See all options"} />
                  )}
                </Stack>
              </WaChatPreview>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </form>
  );
}
