import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  Alert,
  Box,
  Card,
  Divider,
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
import {
  IconAsterisk,
  IconImageInPicture,
  IconInfoCircle,
} from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

import { OrderType, TemplateType, WaTemplateStatus } from "@/types/enums";
import { whatsappTheme } from "@/config/mantineTheme";
import { uploadTemplateMedia } from "@/backend/whatsapp/whatsapp.api";
import {
  useCreateTemplateMutation,
  useSaveTemplateAsDraftMutation,
  useUpdateTemplateMutation,
  useWaTemplateById,
} from "@/backend/whatsapp/whatsapp.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "@/components/input/LengthTracker";
import { LinkCopyElement } from "@/components/input/LinkCopyElement";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import {
  QuickReplyButton,
  ResponseMessageContainer,
} from "@/components/whatsapp/MessageComponents";
import { BroadCastTypeValue } from "@/components/whatsapp/templates/Details/BroadCastTypeValue";
import ButtonInput from "@/components/whatsapp/templates/Details/ButtonInput";
import buttonInputStyles from "@/components/whatsapp/templates/Details/ButtonInput.module.css";
import { ButtonSelection } from "@/components/whatsapp/templates/Details/ButtonSelectionMenu";
import { HeaderWithFormatting } from "@/components/whatsapp/templates/Details/HeaderWithFormating";
import { TextFormateToolBar } from "@/components/whatsapp/templates/Details/TextFormateToolBar";
import TextWithFormatting from "@/components/whatsapp/templates/Details/TextWithFormating";
import {
  configSchema,
  templateSchema,
  WaTemplateDefaultValues,
} from "@/components/whatsapp/templates/Schema/templateSchema";
import WaChatPreview from "@/components/whatsapp/templates/WaChatPreview";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge";
import { useRouteParams } from "@/context/RouteParamsContext";
import useTranslations from "@/dictionaries/useTranslation";
import { getErrorMessage } from "@/utils";
import {
  SAVE_HOTKEY,
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
  WHATSAPP_TEMPLATE_CATEGORY,
  WHATSAPP_TEMPLATE_LANGUAGE,
} from "@/utils/constants";
import { uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast, showWarnToast } from "@/utils/notifications";
import { parseTemplate } from "@/utils/whatsapp/templates";

import styles from "./templateId.module.css";

export default function WhatsappTemplateById() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const { translations } = useTranslations();
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
      footer: "Powered by rateup.app",
      category: "MARKETING",
      format: "NONE",
      buttons: [],
      status: WaTemplateStatus.DRAFT,
      example: [],
      templateType: TemplateType.GENERAL_NOTIFICATION,
      defaultValues: {
        catalog: {
          thumbnail_product_retailer_id: "",
        },
      },
    },
    validate: zodResolver(templateSchema),
  });
  const configForm = useForm<z.infer<typeof configSchema>>({
    initialValues: {
      price: 0,
      tax: 0,
      orderType: null,
      name: "",
    },
    validate: zodResolver(configSchema),
  });
  const isOrderCreate = form.values.templateType === TemplateType.ORDER_DETAILS;

  useEffect(() => {
    if (editingItem) {
      form.resetDirty();
      form.setValues(parseTemplate(editingItem));
      configForm.setValues(editingItem?.config);
      update({ templateId: editingItem?.data?.name });
    }
  }, [editingItem]);

  useEffect(() => {
    switch (form.getValues().templateType) {
      case TemplateType.ORDER_DETAILS:
        form.setFieldValue("category", "UTILITY");
        form.setFieldValue("buttons", [
          {
            type: WHATSAPP_BUTTON_TYPE.ORDER_DETAILS,
            text: "Review and Pay",
          },
        ]);
        form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT);
        break;
      case TemplateType.PAYMENT_CONFIRMATION:
        form.setFieldValue("category", "UTILITY");
        form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE);
        form.setFieldValue("buttons", []);
        break;
      default:
        const currentTemplateType = form.getValues().templateType;
        const previousTemplateType = editingItem?.templateType;

        if (
          (currentTemplateType === TemplateType.LOYALTY &&
            previousTemplateType === TemplateType.GENERAL_NOTIFICATION) ||
          (currentTemplateType === TemplateType.GENERAL_NOTIFICATION &&
            previousTemplateType === TemplateType.LOYALTY) ||
          currentTemplateType === previousTemplateType
        ) {
          const buttons = editingItem?.data?.components?.find(
            (component) => component.type === "BUTTONS",
          )?.buttons;
          form.setFieldValue("buttons", buttons || []);
        } else {
          form.setFieldValue("buttons", []);
        }
        break;
    }
  }, [form.getValues().templateType]);

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
    if (isOrderCreate) {
      const { hasErrors: configHasErrors, errors: configErrors } =
        configForm.validate();
      if (configHasErrors) {
        showErrorToast(
          (Object.values(configErrors)?.[0] as string) ?? "Error in Template",
        );
        return;
      }
    }
    const dynamicVariableArray = parseStringWithVariables(form.values.body);

    if (dynamicVariableArray?.length > 0) {
      if (!isArrayInCorrectOrder(dynamicVariableArray)) {
        showErrorToast(
          translations["Dynamic variables name should is numberic order"],
        );
        return;
      } else if (
        form.values?.example?.length !== dynamicVariableArray?.length
      ) {
        showErrorToast(
          translations["Dynamic variables example values should be given"],
        );
        return;
      }
    }
    const values = form.values;
    if (values?.buttons?.length > 12) {
      showErrorToast(
        translations["Max number of button in buttons should be 12"],
      );
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
        let filename = values.header.name ?? "";
        values.header = file?.id ?? "";
        defaultValues[values.format?.toLowerCase()] = {
          link: publicImageLink,
          filename,
        };
        //@ts-ignore
        values.defaultValues = { ...values.defaultValues, ...defaultValues };
      }
      let templateData = isOrderCreate
        ? { ...values, config: configForm.getValues() }
        : values;
      if (editingItem?.data?.id) {
        if (editingItem.data.status === WaTemplateStatus.PENDING) {
          showWarnToast(
            translations[
              "Cannot edit pending template. Please wait for approval"
            ],
          );
          setIsSubmitting(false);
          return;
        }
        const mutationData = saveAsDraft
          ? { ...values, id: editingItem.id }
          : { templateId: editingItem.id, templateData };
        saveAsDraft
          ? saveTemplateAsDraftMutation.mutate(mutationData)
          : updateTemplateMutation.mutate(mutationData);
      } else {
        const mutationData = { ...templateData, id: editingItem?.id };
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
        : e === WHATSAPP_BUTTON_TYPE.WEBSURVEY
          ? { type: WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE, text: "", example: [] }
          : e === WHATSAPP_BUTTON_TYPE.CATALOG
            ? { type: e, text: "View catalog" }
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
  const ReadonlyOverlay = () => {
    if (editingItem?.data?.id && value) {
      return <Overlay color="#fff" backgroundOpacity={0} zIndex={10} />;
    }
    return null;
  };

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
            mb={"1rem"}
          >
            <Title order={2} c={"var(--grey-color)"}>
              {editingItem
                ? editingItem?.data?.name
                : translations["Create Template"]}
            </Title>
            <Flex
              mih={50}
              gap="xs"
              justify="flex-start"
              align="center"
              direction="row"
              wrap="wrap"
            >
              {editingItem?.data?.id && value ? (
                <RateupButtonPrimary
                  title={translations["Edit"]}
                  onClick={toggle}
                />
              ) : (
                <React.Fragment>
                  {!isOrderCreate && (
                    <RateupButtonPrimary
                      title={translations["Save as draft"]}
                      loading={isSubmittingDraft}
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                    />
                  )}

                  <RateupButtonPrimary
                    title={translations["Save & Submit"]}
                    loading={isSubmitting}
                    onClick={() => handleSubmit(false)}
                  />
                </React.Fragment>
              )}
            </Flex>
          </Flex>
          <Grid>
            <Grid.Col span={{ xs: 12, sm: 7, xl: 9 }} pos={"relative"}>
              <PaperLayout
                className={styles["template-content-container"]}
                h={"80dvh"}
                // style={{
                //   overflow: editingItem?.data?.id && value ? "hidden" : "auto",
                // }}
              >
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
                  <Group justify="space-between" pos={"relative"}>
                    <WaTemplateStatusBadge status={form.values.status} />
                    {editingItem?.data?.id && (
                      <LinkCopyElement
                        link={editingItem?.data?.id}
                        value={editingItem?.data?.id}
                        label={translations["Template ID"]}
                        style={{
                          zIndex: 11,
                        }}
                      />
                    )}
                    <ReadonlyOverlay />
                  </Group>
                  <SimpleGrid cols={2} pos={"relative"}>
                    <ReadonlyOverlay />
                    <ContainedTextField
                      label={
                        <Text fz={14} fw={500}>
                          {translations["Template Name"]} {requiredIcon}
                        </Text>
                      }
                      placeholder={translations["Name"]}
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
                    <ContainedSelection
                      label={
                        <Text fz={14} fw={500}>
                          TemplateType {requiredIcon}
                        </Text>
                      }
                      placeholder={translations["TemplateType"]}
                      {...form.getInputProps("templateType")}
                      data={Object.values(TemplateType)}
                      allowDeselect={false}
                    />
                    {form.getValues().templateType !==
                      TemplateType.PAYMENT_CONFIRMATION && (
                      <ContainedSelection
                        label={
                          <Text fz={14} fw={500}>
                            Category {requiredIcon}
                          </Text>
                        }
                        placeholder={translations["Category"]}
                        {...form.getInputProps("category")}
                        data={WHATSAPP_TEMPLATE_CATEGORY}
                        allowDeselect={false}
                        disabled={isOrderCreate}
                      />
                    )}

                    <ContainedSelection
                      label={
                        <Text fz={14} fw={500}>
                          {translations["Language"]} {requiredIcon}
                        </Text>
                      }
                      placeholder={translations["Language"]}
                      {...form.getInputProps("language")}
                      searchable
                      data={WHATSAPP_TEMPLATE_LANGUAGE}
                      allowDeselect={false}
                    />
                  </SimpleGrid>
                  {form.getValues().templateType !==
                    TemplateType.PAYMENT_CONFIRMATION && (
                    <Grid pos={"relative"}>
                      <ReadonlyOverlay />

                      <Grid.Col span={6}>
                        <ContainedSelection
                          label={
                            <>
                              <Text fz={14} fw={500}>
                                {translations["Broadcast header"]}{" "}
                                {requiredIcon}
                              </Text>
                              <Text fz={13}>
                                {
                                  translations[
                                    "Highlight your brand here, use images or videos, to stand out"
                                  ]
                                }
                              </Text>
                            </>
                          }
                          placeholder={translations["Broadcast Type"]}
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
                          data={
                            isOrderCreate
                              ? [
                                  WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT,
                                  WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
                                ]
                              : Object.values(WHATSAPP_TEMPLATE_BROADCAST_TYPE)
                          }
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
                  )}

                  <Stack gap={0} pos={"relative"}>
                    <ReadonlyOverlay />

                    <Text fz={14} fw={500}>
                      {translations["Body"]} {requiredIcon}
                    </Text>
                    <Text fz={13}>
                      {
                        translations[
                          "Make your messages personal using variables and get more replies!"
                        ]
                      }
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
                      placeholder={translations["Enter the text"]}
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
                  <Stack gap={0} pos={"relative"}>
                    <ReadonlyOverlay />
                    {dynamicVariables?.map((data, index) => (
                      <ContainedTextField
                        key={data}
                        placeholder={`${translations["Enter the content for"]} {{${data}}}`}
                        {...form.getInputProps(`example.${index}`)}
                      />
                    ))}
                    {form.getValues().templateType !==
                      TemplateType.PAYMENT_CONFIRMATION && (
                      <>
                        <ContainedTextField
                          label={
                            <>
                              <Text fz={14} fw={500}>
                                {translations["Footer (Optional)"]}
                              </Text>
                              <Text fz={13}>
                                {
                                  translations[
                                    "Footers are great to add any disclaimers or to add a thoughtful PS"
                                  ]
                                }
                              </Text>
                            </>
                          }
                          placeholder={translations["Footer"]}
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
                          disabled={isOrderCreate}
                          category={form.values.category}
                        />
                        {form.values?.buttons?.length > 0 && (
                          <>
                            {form.values?.buttons?.map((data, index) => (
                              <Group
                                className={buttonInputStyles.buttonBox}
                                key={index}
                              >
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
                        {isOrderCreate && (
                          <>
                            <Text fz={14} fw={500}>
                              {translations["Config"]} {requiredIcon}
                            </Text>
                            <ContainedTextField
                              label={
                                <Text fz={14} fw={500}>
                                  {translations["Name"]} {requiredIcon}
                                </Text>
                              }
                              placeholder={"name"}
                              {...configForm.getInputProps("name")}
                            />
                            <ContainedNumberInput
                              label={
                                <Text fz={14} fw={500}>
                                  {translations["Price"]} {requiredIcon}
                                </Text>
                              }
                              placeholder={translations["price"]}
                              min={0}
                              {...configForm.getInputProps("price")}
                            />
                            <ContainedNumberInput
                              label={
                                <Text fz={14} fw={500}>
                                  {translations["Tax"]} {requiredIcon}
                                </Text>
                              }
                              placeholder={translations["tax"]}
                              min={0}
                              {...configForm.getInputProps("tax")}
                            />
                            <ContainedSelection
                              label={
                                <Text fz={14} fw={500}>
                                  {translations["OrderType"]}
                                </Text>
                              }
                              placeholder={translations["order type"]}
                              data={Object.values(OrderType)}
                              description={
                                'When this field is passed in we hide the "Review and Pay" button and only show the "Pay Now" button in the order details bubble'
                              }
                              {...configForm.getInputProps("orderType")}
                            />
                          </>
                        )}
                      </>
                    )}
                  </Stack>
                </Stack>
              </PaperLayout>
            </Grid.Col>
            <Grid.Col span={{ xs: 12, sm: 5, xl: 3 }}>
              <Card withBorder h={"min(80dvh,660px)"} radius={"lg"}>
                <Stack h={"100%"} align="center" gap={0}>
                  <Text fz="24px" fw={500}>
                    {translations["Preview"]}
                  </Text>
                  <WaChatPreview>
                    <Stack miw="200px" gap={3} p={"md"}>
                      <ResponseMessageContainer>
                        <Box
                          bg={"var(--light-grey-color-2)"}
                          display={isOrderCreate ? "block" : "none"}
                        >
                          <Text fz={"xs"}>
                            {translations["ORDER"]} #{"{{Order number}}"}
                          </Text>
                          <Divider variant="dashed" color={"black"} />

                          <Group>
                            <IconImageInPicture height={50} size={32} />
                            <Box>
                              <Text fz={"xs"}>{"{{Product name}}"}</Text>
                              <Text fz={"xs"}>
                                {translations["Quantity"]} {"{{#}}"}
                              </Text>
                            </Box>
                          </Group>
                          <Divider variant="dashed" color={"black"} />
                          <Group justify="space-between">
                            <Text fz={"xs"}>{translations["Total"]}</Text>
                            <Text fz={"xs"}>${"{{}}"}</Text>
                          </Group>
                        </Box>
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
                          component="pre"
                        >
                          {TextWithFormatting(
                            form.values?.body,
                            form.values?.example,
                          )}
                        </Text>
                        <Text
                          c="dimmed"
                          fz={"0.7rem"}
                          style={{
                            wordBreak: "break-all",
                          }}
                          display={
                            form.getValues().templateType !==
                            TemplateType.PAYMENT_CONFIRMATION
                              ? "block"
                              : "none"
                          }
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
                        <QuickReplyButton
                          text={translations["See all options"]}
                        />
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
