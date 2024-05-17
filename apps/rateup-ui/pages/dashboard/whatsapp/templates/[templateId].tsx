import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Card,
  Flex,
  Grid,
  Group,
  MantineProvider,
  Overlay,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler, useToggle } from "@mantine/hooks";
import { useRouter } from "next/router";

import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import { uploadTemplateMedia } from "../../../../backend/whatsapp/whatsapp.api";
import {
  useCreateTemplateMutation,
  useSaveTemplateAsDraftMutation,
  useUpdateTemplateMutation,
  useWaTemplateById,
} from "../../../../backend/whatsapp/whatsapp.query";
import { RateupButtonPrimary } from "../../../../components/Button/RateupButtons";
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
import {
  WaTemplateDefaultValues,
  templateSchema,
} from "../../../../components/whatsapp/templates/Schema/templateSchema";
import WaChatPreview from "../../../../components/whatsapp/templates/WaChatPreview";
import WaTemplateStatusBadge from "../../../../components/whatsapp/templates/WaTemplateStatusBadge";
import { whatsappTheme } from "../../../../config/mantineTheme";
import { WaTemplateStatus } from "../../../../types/enums";
import {
  SAVE_HOTKEY,
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
  WHATSAPP_TEMPLATE_CATEGORY,
  WHATSAPP_TEMPLATE_LANGUAGE,
} from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";
import { showErrorToast, showWarnToast } from "../../../../utils/notifications";
import { parseTemplate } from "../../../../utils/whatsapp/templates";
import ButtonInput from "../../../../components/whatsapp/templates/Details/ButtonInput";
import styles from "../../../../components/whatsapp/templates/Details/ButtonInput.module.css";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { IconAsterisk, IconInfoCircle } from "@tabler/icons-react";
import { getErrorMessage } from "../../../../utils";
import { useRouteParams } from "../../../../context/RouteParamsContext";

export default function WhatsappTemplateById() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);

  const router = useRouter();
  let templateId = router.query.templateId as string;
  templateId = templateId === "create" ? "" : templateId;
  const { data: editingItem, isPending } = useWaTemplateById(templateId);
  const [selectedText, setSelectedText] = useState("");
  const contentHistory = useRef([]); // Ref to store content history
  const inputRef = useRef(null);
  const [value, toggle] = useToggle([true, false]);
  const { update } = useRouteParams();

  const form = useForm<z.infer<typeof templateSchema>>({
    initialValues: {
      name: "",
      header: null,
      language: "en",
      body: "Would you like to start survey?",
      footer: "",
      category: "MARKETING",
      format: "NONE",
      buttons: [],
      status: WaTemplateStatus.DRAFT,
      example: [],
    },
    validate: zodResolver(templateSchema),
  });
  useEffect(() => {
    if (editingItem) {
      form.resetDirty();
      form.setValues(parseTemplate(editingItem));
      update({ templateId: editingItem?.data?.name });
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
  const saveTemplateAsDraftMutation = useSaveTemplateAsDraftMutation(
    templateId,
    () => {
      setIsSubmittingDraft(false);
      templateId?.length === 0 && router.push("/dashboard/whatsapp/templates/");
    },
    () => {
      setIsSubmittingDraft(false);
    },
  );
  if (templateId && isPending) return <RateupLoader />;

  async function handleSubmit(saveAsDraft: boolean = false) {
    const { hasErrors, errors } = form.validate();
    if (hasErrors) {
      showErrorToast(
        (Object.values(errors)?.[0] as string) ?? "Error in Template",
      );
      return;
    }
    const dynamicVariableArray = parseStringWithVariables(form.values.body);

    if (dynamicVariableArray?.length > 0) {
      if (!isArrayInCorrectOrder(dynamicVariableArray)) {
        showErrorToast("Dynamic variables name should is numberic order");
        return;
      } else if (
        form.values?.example?.length !== dynamicVariableArray?.length
      ) {
        showErrorToast("Dynamic variables example values should be given");
        return;
      }
    }
    const values = form.values;
    if (values?.buttons?.length > 12) {
      showErrorToast(`Max number of button in buttons should be 12`);
      return;
    }
    try {
      if (saveAsDraft) setIsSubmittingDraft(true);
      else setIsSubmitting(true);
      const defaultValues: WaTemplateDefaultValues = {};
      if (
        values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE &&
        values.format !== WHATSAPP_TEMPLATE_BROADCAST_TYPE.LOCATION &&
        values.header instanceof File
      ) {
        const file = await uploadTemplateMedia(values.header);
        const publicImageLink = await uploadFile(values.header);
        values.header = file?.id ?? "";
        // saving upload session id for image type
        if (values.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE) {
          defaultValues.image = {
            link: publicImageLink,
          };
        }
        //@ts-ignore
        values.defaultValues = defaultValues;
      }
      if (editingItem?.data?.id) {
        if (editingItem.data.status === WaTemplateStatus.PENDING) {
          showWarnToast(
            "Cannot edit pending template. Please wait for approval",
          );
          setIsSubmitting(false);
          return;
        }
        const mutationData = saveAsDraft
          ? { ...values, id: editingItem.id }
          : { templateId: editingItem.id, templateData: values };
        saveAsDraft
          ? saveTemplateAsDraftMutation.mutate(mutationData)
          : updateTemplateMutation.mutate(mutationData);
      } else {
        const mutationData = { ...values, id: editingItem?.id };
        saveAsDraft
          ? saveTemplateAsDraftMutation.mutate(mutationData)
          : createTemplateMutation.mutate(mutationData);
      }
    } catch (error) {
      if (saveAsDraft) setIsSubmittingDraft(false);
      else setIsSubmitting(false);
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
    let content = form.values.body;

    if (style.startsWith("{{")) {
      let newContent = content + style;
      form.setFieldValue("body", newContent);
      return;
    }
    if (!selectedText) return;
    const formattedText = `${style}${selectedText}${style}`;
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
    const newObject =
      e === WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE
        ? { type: e, example: "" }
        : { type: e, text: "" };
    if (e !== WHATSAPP_BUTTON_TYPE.QUICK_REPLY) {
      const btn = form.values?.buttons?.filter(
        (data) => data.type === (e as WHATSAPP_BUTTON_TYPE),
      );
      if (btn?.length > 0) {
        showErrorToast(`Only one button allowed for this type`);
        return;
      }
    }
    const newData = form.values.buttons ?? [];
    const lastIndex = newData.reduceRight((index, obj, currentIndex) => {
      if (obj.type === "QUICK_REPLY" && index === -1) {
        return currentIndex;
      }
      return index;
    }, -1);

    if (lastIndex === -1 || e !== WHATSAPP_BUTTON_TYPE.QUICK_REPLY) {
      form.insertListItem("buttons", newObject);
    } else {
      form.insertListItem("buttons", newObject, lastIndex + 1);
    }
  };
  const deleteButton = (index: number) => {
    form.removeListItem("buttons", index);
  };
  const dynamicVariables = parseStringWithVariables(form.values.body);
  const requiredIcon = (
    <sup>
      <IconAsterisk color="red" size={5} />
    </sup>
  );
  return (
    <MantineProvider theme={whatsappTheme}>
      <form>
        <Box
          onKeyDown={getHotkeyHandler([
            [
              SAVE_HOTKEY,
              (event: any) => form.onSubmit((e) => handleSubmit(true))(event),
            ],
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
              gap="xs"
              justify="flex-start"
              align="flex-start"
              direction="row"
              wrap="wrap"
            >
              {editingItem?.data?.id && value ? (
                <RateupButtonPrimary title="Edit" onClick={toggle} />
              ) : (
                <>
                  <RateupButtonPrimary
                    title="Save as draft"
                    loading={isSubmittingDraft}
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                  />
                  <RateupButtonPrimary
                    title="Save & Submit"
                    loading={isSubmitting}
                    onClick={() => handleSubmit(false)}
                  />
                </>
              )}
            </Flex>
          </Flex>
          <Grid>
            <Grid.Col span={{ xs: 12, sm: 7, xl: 9 }} pos={"relative"}>
              {editingItem?.data?.id && value && (
                <Overlay color="#fff" backgroundOpacity={0} />
              )}
              <PaperLayout p={"xl"} h={"80dvh"}>
                <Stack gap={"xs"}>
                  <Alert
                    variant="filled"
                    color="red"
                    icon={<IconInfoCircle />}
                    display={
                      createTemplateMutation.isError ||
                      saveTemplateAsDraftMutation.isError ||
                      updateTemplateMutation.isError
                        ? "block"
                        : "none"
                    }
                  >
                    {getErrorMessage(
                      updateTemplateMutation.error?.response ||
                        saveTemplateAsDraftMutation?.error?.response ||
                        createTemplateMutation?.error?.response,
                      "Error Saving Changes",
                    )}
                  </Alert>
                  <WaTemplateStatusBadge status={form.values.status} />
                  <ContainedTextField
                    label={
                      <Text fz={14} ff={lexend500.style.fontFamily}>
                        Template Name {requiredIcon}
                      </Text>
                    }
                    placeholder="Name"
                    {...form.getInputProps("name")}
                    rightSection={
                      <LengthTracker
                        length={form?.values?.name?.length}
                        maxValue={512}
                        atStart
                      />
                    }
                    disabled={!!editingItem?.data?.id}
                  />
                  <SimpleGrid cols={2}>
                    <ContainedSelection
                      label={
                        <Text fz={14} ff={lexend500.style.fontFamily}>
                          Category {requiredIcon}
                        </Text>
                      }
                      placeholder="Category"
                      {...form.getInputProps("category")}
                      data={WHATSAPP_TEMPLATE_CATEGORY}
                      allowDeselect={false}
                    />
                    <ContainedSelection
                      label={
                        <Text fz={14} ff={lexend500.style.fontFamily}>
                          Language {requiredIcon}
                        </Text>
                      }
                      placeholder="Language"
                      {...form.getInputProps("language")}
                      searchable
                      data={WHATSAPP_TEMPLATE_LANGUAGE}
                      allowDeselect={false}
                    />
                  </SimpleGrid>
                  <Grid>
                    <Grid.Col span={6}>
                      <ContainedSelection
                        label={
                          <>
                            <Text fz={14} ff={lexend500.style.fontFamily}>
                              Broadcast header {requiredIcon}
                            </Text>
                            <Text fz={13}>
                              Highlight your brand here, use images or videos,
                              to stand out
                            </Text>
                          </>
                        }
                        placeholder="Broadcast Type"
                        onChange={(e) => {
                          if (
                            e === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT &&
                            form.values.header instanceof File
                          ) {
                            form.setFieldValue("header", "");
                          }
                          form.setFieldValue("format", e);
                        }}
                        value={form.values.format}
                        data={Object.values(WHATSAPP_TEMPLATE_BROADCAST_TYPE)}
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
                  <Stack gap={0}>
                    <Text fz={14} ff={lexend500.style.fontFamily}>
                      Body {requiredIcon}
                    </Text>
                    <Text fz={13}>
                      Make your messages personal using variables and get more
                      replies!
                    </Text>
                    <TextFormateToolBar
                      applyFormatting={applyFormatting}
                      insertValue={insertValue}
                      undo={undo}
                      dynamicVariables={dynamicVariables}
                    />
                    <Textarea
                      ref={inputRef}
                      styles={{
                        input: {
                          borderRadius: "0px 0px 12px 12px",
                          paddingRight: 90,
                        },
                        section: {
                          width: "fit-content",
                        },
                      }}
                      placeholder={`Enter the text`}
                      autosize
                      minRows={3}
                      onSelect={handleSelect}
                      {...form.getInputProps("body")}
                      rightSection={
                        <LengthTracker
                          length={form?.values?.body?.length}
                          maxValue={1024}
                          atStart
                        />
                      }
                    />
                  </Stack>
                  {dynamicVariables?.map((data, index) => (
                    <ContainedTextField
                      key={data}
                      placeholder={`Enter the content for {{${data}}}`}
                      {...form.getInputProps(`example.${index}`)}
                    />
                  ))}
                  <ContainedTextField
                    label={
                      <>
                        <Text fz={14} ff={lexend500.style.fontFamily}>
                          Footer (Optional)
                        </Text>
                        <Text fz={13}>
                          Footers are great to add any disclaimers or to add a
                          thoughtful PS
                        </Text>
                      </>
                    }
                    placeholder="Footer"
                    {...form.getInputProps("footer")}
                    rightSection={
                      <LengthTracker
                        length={form?.values?.footer?.length}
                        maxValue={60}
                        atStart
                      />
                    }
                  />

                  <ButtonSelection
                    handleMenuSelection={handleMenuSelection}
                    flowBtn={
                      !!form?.values?.buttons?.find(
                        (data) => data.type === "FLOW",
                      )
                    }
                    btnLen={form?.values?.buttons?.length}
                  />
                  {form.values?.buttons?.length > 0 && (
                    <>
                      {form.values?.buttons?.map((data, index) => (
                        <Group className={styles.buttonBox} key={index}>
                          <ButtonInput
                            form={form}
                            deleteButton={deleteButton}
                            index={index}
                            data={data}
                          />
                        </Group>
                      ))}
                    </>
                  )}
                </Stack>
              </PaperLayout>
            </Grid.Col>
            <Grid.Col span={{ xs: 12, sm: 5, xl: 3 }}>
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
                        <Text
                          fz={"0.95rem"}
                          style={{
                            wordBreak: "break-all",
                            whiteSpace: "pre-wrap",
                            fontFamily: "inherit",
                          }}
                          lineClamp={7}
                          component="pre"
                        >
                          {TextWithFormatting(
                            form.values?.body,
                            form.values?.example,
                          )}
                        </Text>
                        <Text
                          c="dimmed"
                          fz={"0.9rem"}
                          style={{
                            wordBreak: "break-all",
                          }}
                        >
                          {form.values.footer}
                        </Text>
                      </ResponseMessageContainer>
                      {form.values?.buttons
                        ?.slice(0, 2)
                        .map((data) => (
                          <QuickReplyButton
                            text={data?.text}
                            key={data?.text}
                            type={data.type}
                          />
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
        </Box>
      </form>
    </MantineProvider>
  );
}
function parseStringWithVariables(string) {
  const regex = /{{(.*?)}}/g;
  let match;
  const dynamicVariables = [];

  // Find all matches of dynamic variables in the string
  while ((match = regex.exec(string)) !== null) {
    dynamicVariables.push(match[1]);
  }

  return dynamicVariables;
}
function isArrayInCorrectOrder(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== (i + 1).toString()) {
      return false;
    }
  }
  return true;
}
