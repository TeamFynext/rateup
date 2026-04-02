"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Alert,
  Box,
  Card,
  Divider,
  Flex,
  Grid,
  Group,
  Overlay,
  ScrollAreaAutosize,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { getHotkeyHandler, useToggle } from "@mantine/hooks";
import {
  IconAsterisk,
  IconImageInPicture,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  OrderType,
  SubscriptionFeaturePathName,
  TemplateType,
  WaTemplateCategory,
  WaTemplateStatus,
} from "@/types/enums";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { uploadTemplateMedia } from "@/backend/whatsapp/whatsapp.api";
import {
  useCreateTemplateMutation,
  useSaveTemplateAsDraftMutation,
  useUpdateTemplateMutation,
  useWaTemplateById,
} from "@/backend/whatsapp/whatsapp.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { AccountSelector } from "@/components/input/AccountSelector";
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
import CardCarousel, {
  ProductCardCarouselPreview,
} from "@/components/whatsapp/templates/Details/CardCarousel";
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
import { getErrorMessage } from "@/utils";
import {
  SAVE_HOTKEY,
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
  WHATSAPP_TEMPLATE_CATEGORY,
  WHATSAPP_TEMPLATE_LANGUAGE,
} from "@/utils/constants";
import { uploadFile } from "@/utils/file-upload/upload";
import { hasFeature } from "@/utils/subscription/subscription";
import { parseTemplate } from "@/utils/whatsapp/templates";

import styles from "../templateId.module.css";

export default function WhatsappTemplateByIdPage() {
  return <WhatsappTemplateById />;
}

export function WhatsappTemplateById({
  forceTemplateType,
}: Readonly<{ forceTemplateType?: TemplateType }>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const translations = useExtracted();
  const router = useRouter();
  const params = useParams();
  let templateId = params.templateId as string;

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
      templateType: forceTemplateType || TemplateType.GENERAL_NOTIFICATION,
      mediaCarousel: [],
      productCarousel: [],
      whatsappSettingsPhoneId: "",
      defaultValues: {
        catalog: {
          thumbnail_product_retailer_id: "",
          mpm: {
            sections: [],
          },
          spm: {
            product_retailer_id: "",
          },
          catalogId: "",
        },
        whatsappSettingsPhoneId: "",
      },
    },
    validate: schemaResolver(templateSchema, {
      sync: true,
    }),
  });
  const configForm = useForm<z.infer<typeof configSchema>>({
    initialValues: {
      price: 0,
      tax: 0,
      orderType: null,
      name: "",
    },
    validate: schemaResolver(configSchema, {
      sync: true,
    }),
  });
  const isOrderCreate = form.values.templateType === TemplateType.ORDER_DETAILS;

  useEffect(() => {
    if (editingItem) {
      form.resetDirty();
      form.setValues(parseTemplate(editingItem));
      const selectedPhoneId =
        editingItem?.whatsappSettingsPhoneId ||
        editingItem?.defaultValues?.whatsappSettingsPhoneId ||
        "";
      form.setFieldValue("whatsappSettingsPhoneId", selectedPhoneId);
      form.setFieldValue(
        "defaultValues.whatsappSettingsPhoneId",
        selectedPhoneId,
      );
      configForm.setValues(editingItem?.config);
      update({ templateId: editingItem?.data?.name });
    }
  }, [editingItem]);

  useEffect(() => {
    if (
      form.values.whatsappSettingsPhoneId !==
      form.values.defaultValues?.whatsappSettingsPhoneId
    ) {
      form.setFieldValue(
        "defaultValues.whatsappSettingsPhoneId",
        form.values.whatsappSettingsPhoneId,
      );
    }
  }, [form.values.whatsappSettingsPhoneId]);

  const { data: subscription, isLoading } = useSubscription();
  const templateTypes = useMemo(
    () =>
      Object.values(forceTemplateType ? [forceTemplateType] : TemplateType).map(
        (type) => ({
          value: type,
          label: type,
          disabled:
            type === TemplateType.CAROUSEL
              ? !subscription ||
                !hasFeature(
                  subscription,
                  SubscriptionFeaturePathName.CarouselTemplate,
                )
              : false,
        }),
      ),
    [subscription],
  );

  const { spmBtn, mpmBtn, checkoutBtn, flowBtn, catalogBtn } = useMemo(() => {
    let spmBtn = false,
      mpmBtn = false,
      checkoutBtn = false,
      flowBtn = false,
      catalogBtn = false;
    form.values.buttons.forEach((b) => {
      if (b.type === WHATSAPP_BUTTON_TYPE.SPM) {
        spmBtn = true;
      }
      if (b.type === WHATSAPP_BUTTON_TYPE.MPM) {
        mpmBtn = true;
      }
      if (b.type === WHATSAPP_BUTTON_TYPE.ORDER_DETAILS) {
        checkoutBtn = true;
      }
      if (b.type === WHATSAPP_BUTTON_TYPE.FLOW) {
        flowBtn = true;
      }
      if (b.type === WHATSAPP_BUTTON_TYPE.CATALOG) {
        catalogBtn = true;
      }
    });
    return { spmBtn, mpmBtn, checkoutBtn, flowBtn, catalogBtn };
  }, [form.values.buttons]);

  useEffect(() => {
    const currentTemplateType = form.getValues().templateType;
    const previousTemplateType = editingItem?.templateType;
    if (currentTemplateType != TemplateType.CAROUSEL) {
      form.setFieldValue("productCarousel", []);
      form.setFieldValue("mediaCarousel", []);
    }
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
      case TemplateType.CAROUSEL:
        form.setFieldValue("category", "MARKETING");
        form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE);
        form.setFieldValue("buttons", []);
        form.setFieldValue("footer", "");
        break;
      default:
        if (
          (currentTemplateType === TemplateType.LOYALTY &&
            previousTemplateType === TemplateType.GENERAL_NOTIFICATION) ||
          (currentTemplateType === TemplateType.GENERAL_NOTIFICATION &&
            previousTemplateType === TemplateType.LOYALTY) ||
          currentTemplateType === previousTemplateType
        ) {
          const buttons = editingItem?.data?.components?.find(
            (component) => component.type.toLowerCase() === "buttons",
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

  const { data: catalog } = useConnectedWaCatalog(
    form.values.whatsappSettingsPhoneId,
  );
  const productRetailerIds = useMemo(
    () => (catalog ? catalog.products?.map((p) => p.retailer_id) : []),
    [catalog],
  );
  useEffect(() => {
    const selectedCatalogId = form.values.defaultValues?.catalog?.catalogId;
    if (
      catalog &&
      (!selectedCatalogId.length || selectedCatalogId !== catalog.catalogId)
    )
      form.setFieldValue("defaultValues.catalog.catalogId", catalog.catalogId);
  }, [catalog]);
  useEffect(() => {
    const variables = parseStringWithVariables(form.values.body);
    const current = form.values.example || [];

    if (current.length === variables.length) return;

    if (current.length > variables.length) {
      form.setFieldValue("example", current.slice(0, variables.length));
    } else {
      const newExamples = [...current];
      while (newExamples.length < variables.length) {
        newExamples.push("");
      }
      form.setFieldValue("example", newExamples);
    }
  }, [form.values.body]);
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
      toast.error(
        (Object.values(errors)?.[0] as string) ?? "Error in Template",
      );
      return;
    }
    if (isOrderCreate) {
      const { hasErrors: configHasErrors, errors: configErrors } =
        configForm.validate();
      if (configHasErrors) {
        toast.error(
          (Object.values(configErrors)?.[0] as string) ?? "Error in Template",
        );
        return;
      }
    }
    const dynamicVariableArray = parseStringWithVariables(
      form.values.body || "",
    );
    const hasEmptyExamples = (form.values.example || []).some(
      (val) => !val || val.trim() === "",
    );

    if (dynamicVariableArray?.length > 0) {
      if (!isArrayInCorrectOrder(dynamicVariableArray)) {
        toast.error(
          "Dynamic variables name should is sequential numeric order",
        );
        return;
      } else if (
        form.values.example.length !== dynamicVariableArray.length ||
        hasEmptyExamples
      ) {
        toast.error("Please provide example values for all dynamic variables");
        return;
      }
    }
    const values = form.values;
    if (values?.buttons?.length > 12) {
      toast.error(translations("Max number of button in buttons should be 12"));
      return;
    }

    if (values?.buttons?.length > 2) {
      const isCustomButtonInMiddle = values.buttons.some((button, index) => {
        return (
          button.type === WHATSAPP_BUTTON_TYPE.QUICK_REPLY &&
          index > 0 &&
          index < values.buttons.length - 1
        );
      });

      if (isCustomButtonInMiddle) {
        toast.error(
          translations(
            "Custom buttons must be placed either at the beginning or at the end of the button list.",
          ),
        );
        return;
      }
    }
    if (values.templateType === TemplateType.CAROUSEL) {
      for (const card of values.mediaCarousel) {
        const dynamicVariableArr = parseStringWithVariables(card.body);
        if (dynamicVariableArr.length > 0) {
          if (!isArrayInCorrectOrder(dynamicVariableArr)) {
            toast.error(
              translations("Dynamic variables name should is numberic order"),
            );
            return;
          } else if (card.example?.length !== dynamicVariableArr?.length) {
            toast.error(
              translations("Dynamic variables example values should be given"),
            );
            return;
          }
        }
      }
      const defaultValueCards = values.defaultValues.productCarousel ?? [];
      values.productCarousel.map((card, index) => {
        const cardIndex = defaultValueCards.findIndex(
          (c) => c.cardIndex === index,
        );
        if (cardIndex !== -1) {
          defaultValueCards[cardIndex].product_retailer_id =
            card.product_retailer_id;
        } else {
          defaultValueCards.push({
            cardIndex: index,
            product_retailer_id: card.product_retailer_id,
          });
        }
      });
      values.defaultValues = {
        ...values.defaultValues,
        productCarousel: defaultValueCards,
      };
    }
    try {
      if (saveAsDraft) setIsSubmittingDraft(true);
      else setIsSubmitting(true);
      const selectedWhatsappPhoneId =
        values.whatsappSettingsPhoneId ||
        values.defaultValues?.whatsappSettingsPhoneId ||
        "";
      values.whatsappSettingsPhoneId = selectedWhatsappPhoneId;
      values.defaultValues = {
        ...values.defaultValues,
        whatsappSettingsPhoneId: selectedWhatsappPhoneId,
      };
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
      if (values.templateType === TemplateType.CAROUSEL) {
        await Promise.all(
          values.mediaCarousel.map(async (card, index) => {
            if (card.header instanceof File) {
              const file = await uploadTemplateMedia(card.header as File);
              const publicImageLink = await uploadFile(card.header);
              values.mediaCarousel[index].header = file?.id ?? "";
              const defValues = values.defaultValues.mediaCarousel ?? [];
              const defCardIndex = defValues.findIndex(
                (v) => v.cardIndex === index,
              );
              const obj = {
                cardIndex: index,
                headerLink: publicImageLink,
              };
              if (defCardIndex !== -1) {
                defValues[defCardIndex] = obj;
              } else {
                defValues.push(obj);
              }
              values.defaultValues = {
                ...values.defaultValues,
                mediaCarousel: defValues,
              };
            }
          }),
        );
      }
      let templateData = isOrderCreate
        ? { ...values, config: configForm.getValues() }
        : values;
      if (editingItem?.data?.id) {
        if (editingItem.data.status === WaTemplateStatus.PENDING) {
          toast.warning(
            translations(
              "Cannot edit pending template. Please wait for approval",
            ),
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
      toast.error(
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
  const getNextVariable = () => {
    const variables = parseStringWithVariables(form.values.body);
    if (variables.length === 0) return "{{1}}";
    const numbers = variables.map(Number);
    const max = Math.max(...numbers);
    return `{{${max + 1}}}`;
  };
  const applyFormatting = (style) => {
    let content = form.values.body;
    if (style.startsWith("{{")) {
      insertValue(getNextVariable());
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
    requestAnimationFrame(() => {
      input.setSelectionRange(newCursorPosition, newCursorPosition);
      input.focus();
    });
  };
  const handleMenuSelection = (e: string, text: string = "") => {
    let newObject;
    if (e === WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE) {
      newObject = { type: e, example: "" };
    } else if (e === WHATSAPP_BUTTON_TYPE.WEBSURVEY) {
      newObject = {
        type: WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE,
        text: "",
        example: [":"],
      };
    } else if (e === WHATSAPP_BUTTON_TYPE.OTP) {
      newObject = { type: e, text, otp_type: "copy_code" };
    } else {
      newObject = { type: e, text };
    }
    if (e !== WHATSAPP_BUTTON_TYPE.QUICK_REPLY) {
      const btn = form.values?.buttons?.filter(
        (data) => data.type === (e as WHATSAPP_BUTTON_TYPE),
      );
      if (btn?.length > 0) {
        toast.error(`Only one button allowed for this type`);
        return;
      }
    }
    const newData = form.values.buttons ?? [];
    if (e === WHATSAPP_BUTTON_TYPE.ORDER_DETAILS) {
      const otherBtns = newData.find(
        (b) => b.type !== WHATSAPP_BUTTON_TYPE.QUICK_REPLY,
      );
      if (otherBtns) {
        toast.error(
          `Only quick reply buttons are allowed along with checkout button. Remove others to add checkout button`,
        );
        return;
      }
      form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE);
      form.setFieldValue("defaultValues", {
        whatsappSettingsPhoneId:
          form.values.whatsappSettingsPhoneId ||
          form.values.defaultValues?.whatsappSettingsPhoneId ||
          "",
        orderDetails: {
          productType: "digital-goods",
          discount: 0.0,
          expiry: null,
          paymentType: "razorpay",
          paymentConfigName: "",
          shipping: 0.0,
          tax: 0.0,
          item: {
            name: "",
            price: 0.0,
            quantity: 1,
            salePrice: 0.0,
            importerAddress1: "",
            importerCity: "",
            importerName: "",
            importerPostalCode: "",
            importerZoneCode: "",
            origin: "",
          },
          discountDescription: "",
          taxDescription: "",
        },
      });
    }
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
    if (e === WHATSAPP_BUTTON_TYPE.SPM) {
      form.setFieldValue("header", null);
      form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.PRODUCT);
    }
    if (e === WHATSAPP_BUTTON_TYPE.CATALOG) {
      form.setFieldValue("header", null);
      form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE);
      form.setFieldValue("category", "MARKETING");
    }
    if (e === WHATSAPP_BUTTON_TYPE.MPM) {
      form.setFieldValue("header", "");
      form.setFieldValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT);
      form.setFieldValue("category", "MARKETING");
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
              : translations("Create Template")}
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
                title={translations("Edit")}
                onClick={toggle}
              />
            ) : (
              <React.Fragment>
                {!isOrderCreate && (
                  <RateupButtonPrimary
                    title={translations("Save as draft")}
                    loading={isSubmittingDraft}
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                  />
                )}

                <RateupButtonPrimary
                  title={translations("Save & Submit")}
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
              h={"85dvh"}
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
                  {updateTemplateMutation.error?.message ||
                    saveTemplateAsDraftMutation?.error?.message ||
                    createTemplateMutation?.error?.message ||
                    "Error Saving Changes"}
                </Alert>
                <Group justify="space-between" pos={"relative"}>
                  <WaTemplateStatusBadge status={form.values.status} />
                  {editingItem?.data?.id && (
                    <LinkCopyElement
                      link={editingItem?.data?.id}
                      value={editingItem?.data?.id}
                      label={translations("Template ID")}
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
                      <Group gap={4} wrap="nowrap">
                        <Text fz={14} fw={500}>
                          {translations("Template Name")}
                        </Text>
                        {requiredIcon}
                        <Text c="blue" size="xs">
                          (
                          {translations(
                            "Lower-case letters and underscores only",
                          )}
                          )
                        </Text>
                      </Group>
                    }
                    placeholder={translations("Name")}
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
                      <Group gap={4} wrap="nowrap">
                        <Text fz={14} fw={500}>
                          TemplateType
                        </Text>
                        {requiredIcon}
                      </Group>
                    }
                    placeholder={translations("TemplateType")}
                    {...form.getInputProps("templateType")}
                    data={templateTypes}
                    allowDeselect={false}
                  />
                  {form.getValues().templateType !==
                    TemplateType.PAYMENT_CONFIRMATION &&
                    form.getValues().templateType !== TemplateType.CAROUSEL && (
                      <ContainedSelection
                        label={
                          <Group gap={4} wrap="nowrap">
                            <Text fz={14} fw={500}>
                              Category
                            </Text>
                            {requiredIcon}
                          </Group>
                        }
                        placeholder={translations("Category")}
                        {...form.getInputProps("category")}
                        data={WHATSAPP_TEMPLATE_CATEGORY}
                        allowDeselect={false}
                        disabled={
                          isOrderCreate ||
                          catalogBtn ||
                          spmBtn ||
                          mpmBtn ||
                          checkoutBtn
                        }
                      />
                    )}

                  <ContainedSelection
                    label={
                      <Group gap={4} wrap="nowrap">
                        <Text fz={14} fw={500}>
                          {translations("Language")}
                        </Text>
                        {requiredIcon}
                      </Group>
                    }
                    placeholder={translations("Language")}
                    {...form.getInputProps("language")}
                    searchable
                    data={WHATSAPP_TEMPLATE_LANGUAGE}
                    allowDeselect={false}
                  />
                  <div>
                    <AccountSelector
                      value={form.values.whatsappSettingsPhoneId}
                      onChange={(value) => {
                        form.setFieldValue(
                          "whatsappSettingsPhoneId",
                          value ?? "",
                        );
                        form.setFieldValue(
                          "defaultValues.whatsappSettingsPhoneId",
                          value ?? "",
                        );
                      }}
                      label={translations("Account")}
                      className="h-10"
                    />
                  </div>
                </SimpleGrid>
                {form.values?.category !== WaTemplateCategory.AUTHENTICATION &&
                  form.getValues().templateType !==
                    TemplateType.PAYMENT_CONFIRMATION &&
                  form.getValues().templateType !== TemplateType.CAROUSEL && (
                    <Grid pos={"relative"}>
                      <ReadonlyOverlay />
                      <Grid.Col span={6}>
                        <ContainedSelection
                          label={
                            <>
                              <Group gap={4} wrap="nowrap">
                                <Text fz={14} fw={500} w={"max-content"}>
                                  {translations("Broadcast header")}{" "}
                                </Text>
                                {requiredIcon}
                              </Group>
                              <Text fz={13}>
                                {translations(
                                  "Highlight your brand here, use images or videos, to stand out",
                                )}
                              </Text>
                            </>
                          }
                          placeholder={translations("Broadcast Type")}
                          onChange={(e) => {
                            const currentHeader = form.values.header;
                            if (currentHeader) {
                              const isFile = currentHeader instanceof File;
                              if (
                                e === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT ||
                                isFile
                              ) {
                                form.setFieldValue("header", null);
                              }
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
                              : checkoutBtn
                                ? [
                                    WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
                                    WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO,
                                  ]
                                : Object.values(
                                    WHATSAPP_TEMPLATE_BROADCAST_TYPE,
                                  )
                          }
                          allowDeselect={false}
                          disabled={spmBtn || catalogBtn || mpmBtn}
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
                  {form.values?.category !==
                    WaTemplateCategory.AUTHENTICATION && (
                    <>
                      <Group gap={4} wrap="nowrap">
                        <Text fz={14} fw={500}>
                          {translations("Body")}
                        </Text>
                        {requiredIcon}
                      </Group>
                      <Text fz={13}>
                        {translations(
                          "Make your messages personal using variables and get more replies!",
                        )}
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
                        placeholder={translations("Enter the text")}
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
                    </>
                  )}
                </Stack>
                <Stack gap={0} pos={"relative"}>
                  <ReadonlyOverlay />
                  {form.values?.category !==
                    WaTemplateCategory.AUTHENTICATION &&
                    dynamicVariables?.map((data, index) => (
                      <ContainedTextField
                        key={data}
                        placeholder={`${translations("Enter the content for")} {{${data}}}`}
                        {...form.getInputProps(`example.${index}`)}
                      />
                    ))}

                  {form.getValues().templateType !==
                    TemplateType.PAYMENT_CONFIRMATION &&
                    form.getValues().templateType !== TemplateType.CAROUSEL && (
                      <>
                        {form.values?.category !==
                        WaTemplateCategory.AUTHENTICATION ? (
                          <ContainedTextField
                            label={
                              <>
                                <Text fz={14} fw={500}>
                                  {translations("Footer (Optional)")}
                                </Text>
                                <Text fz={13}>
                                  {translations(
                                    "Footers are great to add any disclaimers or to add a thoughtful PS",
                                  )}
                                </Text>
                              </>
                            }
                            placeholder={translations("Footer")}
                            {...form.getInputProps("footer")}
                            rightSection={
                              <LengthTracker
                                length={form?.values?.footer?.length}
                                maxValue={60}
                                atStart
                              />
                            }
                          />
                        ) : (
                          <ContainedNumberInput
                            label={
                              <Text fz={14} fw={500}>
                                {translations("Code Expiration (minutes)")}
                              </Text>
                            }
                            placeholder={translations("Expiration time")}
                            min={1}
                            max={90}
                            {...form.getInputProps("code_expiration_minutes")}
                          />
                        )}

                        <ButtonSelection
                          handleMenuSelection={handleMenuSelection}
                          flowBtn={flowBtn}
                          mpmBtn={mpmBtn}
                          checkoutBtn={checkoutBtn}
                          catalogBtn={catalogBtn}
                          spmBtn={spmBtn}
                          btnLen={form?.values?.buttons?.length}
                          disabled={isOrderCreate}
                          category={form.values?.category as any}
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
                                  catalog={catalog}
                                  productRetailerIds={productRetailerIds}
                                />
                              </Group>
                            ))}
                          </>
                        )}
                        {isOrderCreate && (
                          <>
                            <Group gap={4} wrap="nowrap">
                              <Text fz={14} fw={500}>
                                {translations("Config")}
                              </Text>
                              {requiredIcon}
                            </Group>
                            <ContainedTextField
                              label={
                                <Group gap={4} wrap="nowrap">
                                  <Text fz={14} fw={500}>
                                    {translations("Name")}
                                  </Text>
                                  {requiredIcon}
                                </Group>
                              }
                              placeholder={"name"}
                              {...configForm.getInputProps("name")}
                            />
                            <ContainedNumberInput
                              label={
                                <Group gap={4} wrap="nowrap">
                                  <Text fz={14} fw={500}>
                                    {translations("Price")}
                                  </Text>
                                  {requiredIcon}
                                </Group>
                              }
                              placeholder={translations("price")}
                              min={0}
                              {...configForm.getInputProps("price")}
                            />
                            <ContainedNumberInput
                              label={
                                <Group gap={4} wrap="nowrap">
                                  <Text fz={14} fw={500}>
                                    {translations("Tax")}
                                  </Text>
                                  {requiredIcon}
                                </Group>
                              }
                              placeholder={translations("tax")}
                              min={0}
                              {...configForm.getInputProps("tax")}
                            />
                            <ContainedSelection
                              label={
                                <Text fz={14} fw={500}>
                                  {translations("OrderType")}
                                </Text>
                              }
                              placeholder={translations("order type")}
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
                  {form.getValues().templateType === TemplateType.CAROUSEL && (
                    <CardCarousel
                      form={form}
                      catalog={catalog}
                      productRetailerIds={productRetailerIds}
                    />
                  )}
                </Stack>
              </Stack>
            </PaperLayout>
          </Grid.Col>
          <Grid.Col span={{ xs: 12, sm: 5, xl: 3 }}>
            <Card withBorder h={"min(80dvh,660px)"} radius={"lg"}>
              <Stack h={"100%"} align="center" gap={0}>
                <Text fz="24px" fw={500}>
                  {translations("Preview")}
                </Text>
                <WaChatPreview>
                  <Stack miw="200px" gap={3} p={"md"}>
                    <ResponseMessageContainer>
                      <Box
                        bg={"var(--light-grey-color-2)"}
                        display={isOrderCreate ? "block" : "none"}
                      >
                        <Text fz={"xs"}>
                          {translations("ORDER")} #{"{{Order number}}"}
                        </Text>
                        <Divider variant="dashed" color={"black"} />

                        <Group>
                          <IconImageInPicture height={50} size={32} />
                          <Box>
                            <Text fz={"xs"}>{"{{Product name}}"}</Text>
                            <Text fz={"xs"}>
                              {translations("Quantity")} {"{{#}}"}
                            </Text>
                          </Box>
                        </Group>
                        <Divider variant="dashed" color={"black"} />
                        <Group justify="space-between">
                          <Text fz={"xs"}>{translations("Total")}</Text>
                          <Text fz={"xs"}>${"{{}}"}</Text>
                        </Group>
                      </Box>
                      {HeaderWithFormatting(
                        form.values?.header,
                        form.values?.format,
                      )}
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
                          form?.values?.category,
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
                        {form.values?.category ===
                        WaTemplateCategory.AUTHENTICATION
                          ? form.values?.code_expiration_minutes
                            ? `Expires in ${form.values?.code_expiration_minutes} minutes.`
                            : ""
                          : form.values.footer}
                      </Text>
                    </ResponseMessageContainer>
                    {form.values?.buttons?.slice(0, 2).map((data) => (
                      <QuickReplyButton
                        text={data?.text}
                        key={data?.text}
                        type={data.type}
                      />
                    ))}
                    {form.values?.buttons?.length > 2 && (
                      <QuickReplyButton
                        text={translations("See all options")}
                      />
                    )}
                    <ScrollAreaAutosize maw={"220px"}>
                      <Box
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 8,
                          width: "fit-content",
                          padding: 4,
                        }}
                      >
                        {form.values.mediaCarousel?.map((card, index) => (
                          <Stack
                            w={"180px"}
                            bg={"white"}
                            key={index}
                            gap={1}
                            style={{ borderRadius: "10px" }}
                          >
                            {HeaderWithFormatting(card?.header, card?.format)}
                            <Text
                              fz={"0.95rem"}
                              style={{
                                wordBreak: "break-all",
                                whiteSpace: "pre-wrap",
                                fontFamily: "inherit",
                              }}
                              component="pre"
                              p={"xs"}
                            >
                              {TextWithFormatting(
                                card?.body,
                                card?.example,
                                form?.values?.category,
                              )}
                            </Text>
                            {card?.buttons.map((data) => (
                              <QuickReplyButton
                                text={data?.text}
                                key={data?.text}
                                type={data?.type}
                              />
                            ))}
                          </Stack>
                        ))}
                        <ProductCardCarouselPreview
                          form={form}
                          catalog={catalog}
                        />
                      </Box>
                    </ScrollAreaAutosize>
                  </Stack>
                </WaChatPreview>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Box>
    </form>
  );
}
export function parseStringWithVariables(string) {
  const regex = /{{(\d+)}}/g;
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
