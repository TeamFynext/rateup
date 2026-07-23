import { IconAsterisk, IconImageInPicture, IconInfoCircle } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { z } from "zod/v4";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { uploadTemplateMedia } from "@/backend/whatsapp/whatsapp.api";
import {
  useCreateTemplateMutation,
  useSaveTemplateAsDraftMutation,
  useUpdateTemplateMutation,
  useWaTemplateById,
} from "@/backend/whatsapp/whatsapp.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { LinkCopyElement } from "@/components/input/LinkCopyElement.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  QuickReplyButton,
  ResponseMessageContainer,
} from "@/components/whatsapp/MessageComponents.tsx";
import { BroadCastTypeValue } from "@/components/whatsapp/templates/Details/BroadCastTypeValue.tsx";
import ButtonInput from "@/components/whatsapp/templates/Details/ButtonInput.tsx";
import { ButtonSelection } from "@/components/whatsapp/templates/Details/ButtonSelectionMenu.tsx";
import CardCarousel, {
  ProductCardCarouselPreview,
} from "@/components/whatsapp/templates/Details/CardCarousel.tsx";
import { HeaderWithFormatting } from "@/components/whatsapp/templates/Details/HeaderWithFormating.tsx";
import { TextFormateToolBar } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";
import TextWithFormatting from "@/components/whatsapp/templates/Details/TextWithFormating.tsx";
import type { WaTemplateDefaultValues } from "@/components/whatsapp/templates/Schema/templateSchema.ts";
import {
  configSchema,
  templateSchema,
} from "@/components/whatsapp/templates/Schema/templateSchema.ts";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge.tsx";
import { WhatsAppChatShell } from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { useToggle } from "@/hooks/use-toggle.ts";
import { useBridgedForm } from "@/hooks/useBridgedForm";
import { cn } from "@/lib/utils";
import {
  OrderType,
  SubscriptionFeaturePathName,
  TemplateType,
  WaTemplateCategory,
  WaTemplateStatus,
} from "@/types/enums.ts";
import {
  SAVE_HOTKEY,
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
  WHATSAPP_TEMPLATE_CATEGORY,
  WHATSAPP_TEMPLATE_LANGUAGE,
} from "@/utils/constants.ts";
import { uploadFile } from "@/utils/file-upload/upload.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import { toSelectOptions } from "@/utils/select-options.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";
import { parseStringWithVariables, parseTemplate } from "@/utils/whatsapp/templates.tsx";

import styles from "@/components/dashboard/whatsapp/templates/templateId.module.css";
import buttonInputStyles from "@/components/whatsapp/templates/Details/ButtonInput.module.css";

export function WhatsappTemplateById({
  forceTemplateType,
}: Readonly<{ forceTemplateType?: TemplateType }>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const params = useParams({
    strict: false,
  });
  let templateId = params.templateId as string;

  templateId = templateId === "create" ? "" : templateId;
  const { data: editingItem, isPending } = useWaTemplateById(templateId);
  const [selectedText, setSelectedText] = useState("");
  const contentHistory = useRef([]); // Ref to store content history
  const inputRef = useRef(null);
  const [value, toggle] = useToggle([true, false]);
  const { update } = useRouteParams();
  const form = useBridgedForm<z.infer<typeof templateSchema>>({
    schema: templateSchema,
    defaultValues: {
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
  });
  const configForm = useBridgedForm<z.infer<typeof configSchema>>({
    schema: configSchema,
    defaultValues: {
      price: 0,
      tax: 0,
      orderType: null,
      name: "",
    },
  });
  const isOrderCreate = form.values.templateType === TemplateType.ORDER_DETAILS;
  // Chat bubble background; the shadcn card token resolves per-theme.
  const bubbleBg = "var(--card)";

  useEffect(() => {
    if (editingItem) {
      form.setValues(parseTemplate(editingItem));
      const selectedPhoneId =
        editingItem?.whatsappSettingsPhoneId ||
        editingItem?.defaultValues?.whatsappSettingsPhoneId ||
        "";
      form.setFieldValue("whatsappSettingsPhoneId", selectedPhoneId);
      form.setFieldValue("defaultValues.whatsappSettingsPhoneId", selectedPhoneId);
      configForm.setValues(editingItem?.config);
      update({ templateId: editingItem?.data?.name });
    }
  }, [editingItem]);

  useEffect(() => {
    if (
      form.values.whatsappSettingsPhoneId !== form.values.defaultValues?.whatsappSettingsPhoneId
    ) {
      form.setFieldValue(
        "defaultValues.whatsappSettingsPhoneId",
        form.values.whatsappSettingsPhoneId,
      );
    }
  }, [form.values.whatsappSettingsPhoneId]);

  const { data: subscription } = useSubscription();
  const templateTypes = useMemo(
    () =>
      Object.values(forceTemplateType ? [forceTemplateType] : TemplateType).map((type) => ({
        value: type,
        label: type,
        disabled:
          type === TemplateType.CAROUSEL
            ? !subscription || !hasFeature(subscription, SubscriptionFeaturePathName.Whatsapp)
            : false,
      })),
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

  const templateTypeOptions = toSelectOptions(templateTypes);
  const categoryOptions = toSelectOptions(WHATSAPP_TEMPLATE_CATEGORY);
  const languageOptions = toSelectOptions(WHATSAPP_TEMPLATE_LANGUAGE);
  const orderTypeOptions = toSelectOptions(Object.values(OrderType));
  const broadcastTypeOptions = toSelectOptions(
    isOrderCreate
      ? [WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT, WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE]
      : checkoutBtn
        ? [WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE, WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO]
        : Object.values(WHATSAPP_TEMPLATE_BROADCAST_TYPE)?.filter(
            (data) => data !== WHATSAPP_TEMPLATE_BROADCAST_TYPE.PRODUCT,
          ),
  );

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
      navigate({
        to: "/dashboard/whatsapp/templates/",
      });
    },
    () => {
      setIsSubmitting(false);
    },
  );

  const { data: catalog } = useConnectedWaCatalog(form.values.whatsappSettingsPhoneId);
  const productRetailerIds = useMemo(
    () => (catalog ? catalog.products?.map((p) => p.retailer_id) : []),
    [catalog],
  );
  useEffect(() => {
    const selectedCatalogId = form.values.defaultValues?.catalog?.catalogId;
    if (catalog && (!selectedCatalogId.length || selectedCatalogId !== catalog.catalogId))
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
      if (templateId?.length === 0) {
        navigate({
          to: "/dashboard/whatsapp/templates/",
        });
      }
    },
    () => {
      setIsSubmittingDraft(false);
    },
  );
  if (templateId && isPending) return <RateupLoader />;

  /** First validation message from an RHF error tree, for the toast. */
  function firstErrorMessage(errors: unknown): string | undefined {
    for (const value of Object.values((errors ?? {}) as Record<string, any>)) {
      if (typeof value?.message === "string") return value.message;
      if (value && typeof value === "object") {
        const nested = firstErrorMessage(value);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  async function handleSubmit(saveAsDraft: boolean = false) {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(firstErrorMessage(form.formState.errors) ?? "Error in Template");
      return;
    }
    if (isOrderCreate) {
      const configIsValid = await configForm.trigger();
      if (!configIsValid) {
        toast.error(firstErrorMessage(configForm.formState.errors) ?? "Error in Template");
        return;
      }
    }
    const dynamicVariableArray = parseStringWithVariables(form.values.body || "");
    const hasEmptyExamples = (form.values.example || []).some((val) => !val || val.trim() === "");

    if (dynamicVariableArray?.length > 0) {
      if (!isArrayInCorrectOrder(dynamicVariableArray)) {
        toast.error("Dynamic variables name should is sequential numeric order");
        return;
      } else if (form.values.example.length !== dynamicVariableArray.length || hasEmptyExamples) {
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
      const buttons = values.buttons;
      const quickReplyIndexes = buttons
        .map((btn, idx) => (btn.type === WHATSAPP_BUTTON_TYPE.QUICK_REPLY ? idx : -1))
        .filter((idx) => idx !== -1);

      if (quickReplyIndexes.length > 0) {
        // Check if all quick replies are contiguous
        const isContiguous = quickReplyIndexes.every(
          (idx, i, arr) => i === 0 || idx === arr[i - 1] + 1,
        );
        // Check if they are at the start or end
        const atStart =
          quickReplyIndexes[0] === 0 &&
          quickReplyIndexes[quickReplyIndexes.length - 1] === quickReplyIndexes.length - 1;
        const atEnd =
          quickReplyIndexes[quickReplyIndexes.length - 1] === buttons.length - 1 &&
          quickReplyIndexes[0] === buttons.length - quickReplyIndexes.length;

        if (!(isContiguous && (atStart || atEnd))) {
          toast.error(
            translations(
              "All quick reply buttons must be grouped together at the beginning or end of the button list.",
            ),
          );
          return;
        }
      }
    }
    if (values.templateType === TemplateType.CAROUSEL) {
      for (const card of values.mediaCarousel) {
        const dynamicVariableArr = parseStringWithVariables(card.body);
        if (dynamicVariableArr.length > 0) {
          if (!isArrayInCorrectOrder(dynamicVariableArr)) {
            toast.error(translations("Dynamic variables name should is numberic order"));
            return;
          } else if (card.example?.length !== dynamicVariableArr?.length) {
            toast.error(translations("Dynamic variables example values should be given"));
            return;
          }
        }
      }
      const defaultValueCards = values.defaultValues.productCarousel ?? [];
      values.productCarousel.map((card, index) => {
        const cardIndex = defaultValueCards.findIndex((c) => c.cardIndex === index);
        if (cardIndex !== -1) {
          defaultValueCards[cardIndex].product_retailer_id = card.product_retailer_id;
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
        values.whatsappSettingsPhoneId || values.defaultValues?.whatsappSettingsPhoneId || "";
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
        const filename = values.header.name ?? "";
        values.header = file?.id ?? "";
        defaultValues[values.format?.toLowerCase()] = {
          link: publicImageLink,
          filename,
        };
        // @ts-ignore
        values.defaultValues = { ...values.defaultValues, ...defaultValues };
      }
      if (values.templateType === TemplateType.CAROUSEL) {
        await Promise.all(
          values.mediaCarousel.map(async (card, index) => {
            if (card.header instanceof File) {
              const file = await uploadTemplateMedia(card.header);
              const publicImageLink = await uploadFile(card.header);
              values.mediaCarousel[index].header = file?.id ?? "";
              const defValues = values.defaultValues.mediaCarousel ?? [];
              const defCardIndex = defValues.findIndex((v) => v.cardIndex === index);
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
      const templateData = isOrderCreate ? { ...values, config: configForm.getValues() } : values;
      if (editingItem?.data?.id) {
        if (editingItem.data.status === WaTemplateStatus.PENDING) {
          toast.warning(translations("Cannot edit pending template. Please wait for approval"));
          setIsSubmitting(false);
          return;
        }
        const mutationData = saveAsDraft
          ? { ...values, id: editingItem.id }
          : { templateId: editingItem.id, templateData };
        if (saveAsDraft) {
          saveTemplateAsDraftMutation.mutate(mutationData);
        } else {
          updateTemplateMutation.mutate(mutationData);
        }
      } else {
        const mutationData = { ...templateData, id: editingItem?.id };
        if (saveAsDraft) {
          saveTemplateAsDraftMutation.mutate(mutationData);
        } else {
          createTemplateMutation.mutate(mutationData);
        }
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
    const content = form.values.body;
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
      const btn = form.values?.buttons?.filter((data) => data.type === (e as WHATSAPP_BUTTON_TYPE));
      if (btn?.length > 0) {
        toast.error(`Only one button allowed for this type`);
        return;
      }
    }
    const newData = form.values.buttons ?? [];
    if (e === WHATSAPP_BUTTON_TYPE.ORDER_DETAILS) {
      const otherBtns = newData.find((b) => b.type !== WHATSAPP_BUTTON_TYPE.QUICK_REPLY);
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

  function ReadonlyOverlay() {
    if (editingItem?.data?.id && value) {
      return <div className="absolute inset-0 z-10" />;
    }
    return null;
  }

  const messageContent = (
    <div className="flex flex-col p-4">
      <ResponseMessageContainer backgroundColor={bubbleBg}>
        <div>
          <p className="text-xs">
            {translations("ORDER")} #{"{{Order number}}"}
          </p>
          <Separator className="border-dashed" />

          <div className="flex items-center">
            <IconImageInPicture height={50} size={32} />
            <div>
              <p className="text-xs">{"{{Product name}}"}</p>
              <p className="text-xs">
                {translations("Quantity")} {"{{#}}"}
              </p>
            </div>
          </div>
          <Separator className="border-dashed" />
          <div className="flex items-center justify-between">
            <p className="text-xs">{translations("Total")}</p>
            <p className="text-xs">${"{{}}"}</p>
          </div>
        </div>
        {HeaderWithFormatting(form.values?.header, form.values?.format)}
        <p
          style={{
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
          }}
        >
          {TextWithFormatting(form.values?.body, form.values?.example, form?.values?.category)}
        </p>
        <p
          className="text-muted-foreground"
          style={{
            wordBreak: "break-all",
          }}
        >
          {form.values?.category === WaTemplateCategory.AUTHENTICATION
            ? form.values?.code_expiration_minutes
              ? `Expires in ${form.values?.code_expiration_minutes} minutes.`
              : ""
            : form.values.footer}
        </p>
      </ResponseMessageContainer>
      {form.values?.buttons?.slice(0, 2).map((data) => (
        <QuickReplyButton
          text={data?.text}
          key={data?.text}
          type={data.type}
          style={{ backgroundColor: bubbleBg }}
        />
      ))}
      {form.values?.buttons?.length > 2 && (
        <QuickReplyButton
          text={translations("See all options")}
          style={{ backgroundColor: bubbleBg }}
        />
      )}
      <ScrollArea>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
            width: "fit-content",
            padding: 4,
          }}
        >
          {form.values.mediaCarousel?.map((card, index) => (
            <div
              className="flex w-45 flex-col gap-px"
              key={index}
              style={{ borderRadius: "10px", background: bubbleBg }}
            >
              {HeaderWithFormatting(card?.header, card?.format)}
              <p
                className="p-2.5"
                style={{
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                }}
              >
                {TextWithFormatting(card?.body, card?.example, form?.values?.category)}
              </p>
              {card?.buttons.map((data) => (
                <QuickReplyButton
                  text={data?.text}
                  key={data?.text}
                  type={data?.type}
                  style={{ backgroundColor: bubbleBg }}
                />
              ))}
            </div>
          ))}
          <ProductCardCarouselPreview form={form} catalog={catalog} />
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <form>
      <div onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => handleSubmit(true)]])}>
        <div className="flex gap-4 justify-between items-center">
          <h2 className="text-2xl font-semibold">
            {editingItem ? editingItem?.data?.name : translations("Create Template")}
          </h2>
          <div className="flex gap-2.5 justify-start items-center">
            <PhonePreviewButton platform="whatsapp" label={translations("Preview")}>
              <WhatsAppChatShell>{messageContent}</WhatsAppChatShell>
            </PhonePreviewButton>
            {editingItem?.data?.id && value ? (
              <Button onClick={() => toggle()}>{translations("Edit")}</Button>
            ) : (
              <React.Fragment>
                {!isOrderCreate && (
                  <Button
                    variant="outline"
                    disabled={isSubmittingDraft}
                    onClick={() => handleSubmit(true)}
                  >
                    {isSubmittingDraft && <Spinner />}
                    {translations("Save as draft")}
                  </Button>
                )}

                <Button disabled={isSubmitting} onClick={() => handleSubmit(false)}>
                  {isSubmitting && <Spinner />}
                  {translations("Save & Submit")}
                </Button>
              </React.Fragment>
            )}
          </div>
        </div>
        <div
          className={cn(
            "w-full overflow-auto rounded-lg bg-card p-4 shadow-md",
            styles["template-content-container"],
          )}
        >
          <div className="flex flex-col gap-2.5">
            {(createTemplateMutation.isError ||
              saveTemplateAsDraftMutation.isError ||
              updateTemplateMutation.isError) && (
              <Alert variant="destructive">
                <IconInfoCircle />
                <AlertDescription>
                  {updateTemplateMutation.error?.message ||
                    saveTemplateAsDraftMutation?.error?.message ||
                    createTemplateMutation?.error?.message ||
                    "Error Saving Changes"}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
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
            </div>
            <div className="relative grid grid-cols-2 gap-4">
              <ReadonlyOverlay />
              <Field>
                <FieldLabel>
                  <div className="flex items-center gap-1 flex-nowrap">
                    <p className="text-sm font-medium">{translations("Template Name")}</p>
                    {requiredIcon}
                    <p className="text-xs text-blue-600">
                      ({translations("Lower-case letters and underscores only")})
                    </p>
                  </div>
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    placeholder={translations("Name")}
                    disabled={!!editingItem?.data?.id}
                    {...form.getFieldProps("name")}
                  />
                  <InputGroupAddon align="inline-end">
                    <LengthTracker length={form?.values?.name?.length} maxValue={512} atStart />
                  </InputGroupAddon>
                </InputGroup>
                {form.errors.name && <FieldError>{form.errors.name}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>
                  <div className="flex items-center gap-1 flex-nowrap">
                    <p className="text-sm font-medium">TemplateType</p>
                    {requiredIcon}
                  </div>
                </FieldLabel>
                <Select
                  items={templateTypeOptions}
                  value={form.values.templateType ?? ""}
                  onValueChange={(value) => form.setFieldValue("templateType", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translations("TemplateType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {form.getValues().templateType !== TemplateType.PAYMENT_CONFIRMATION &&
                form.getValues().templateType !== TemplateType.CAROUSEL && (
                  <Field>
                    <FieldLabel>
                      <div className="flex items-center gap-1 flex-nowrap">
                        <p className="text-sm font-medium">Category</p>
                        {requiredIcon}
                      </div>
                    </FieldLabel>
                    <Select
                      items={categoryOptions}
                      value={form.values.category ?? ""}
                      onValueChange={(value) => form.setFieldValue("category", value)}
                      disabled={isOrderCreate || catalogBtn || spmBtn || mpmBtn || checkoutBtn}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={translations("Category")} />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

              <Field>
                <FieldLabel>
                  <div className="flex items-center gap-1 flex-nowrap">
                    <p className="text-sm font-medium">{translations("Language")}</p>
                    {requiredIcon}
                  </div>
                </FieldLabel>
                <Select
                  items={languageOptions}
                  value={form.values.language ?? ""}
                  onValueChange={(value) => form.setFieldValue("language", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translations("Language")} />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div>
                <AccountSelector
                  value={form.values.whatsappSettingsPhoneId}
                  onChange={(value) => {
                    form.setFieldValue("whatsappSettingsPhoneId", value ?? "");
                    form.setFieldValue("defaultValues.whatsappSettingsPhoneId", value ?? "");
                  }}
                  label={translations("Account")}
                  className="h-10"
                />
              </div>
            </div>
            {form.values?.category !== WaTemplateCategory.AUTHENTICATION &&
              form.getValues().templateType !== TemplateType.PAYMENT_CONFIRMATION &&
              form.getValues().templateType !== TemplateType.CAROUSEL && (
                <div className="relative grid grid-cols-12 gap-4">
                  <ReadonlyOverlay />
                  <div className="col-span-6">
                    <Field>
                      <FieldLabel>
                        <div>
                          <div className="flex items-center gap-1 flex-nowrap">
                            <p className="text-sm font-medium">
                              {translations("Broadcast header")}{" "}
                            </p>
                            {requiredIcon}
                          </div>
                          <p className="text-[13px]">
                            {translations(
                              "Highlight your brand here, use images or videos, to stand out",
                            )}
                          </p>
                        </div>
                      </FieldLabel>
                      <Select
                        items={broadcastTypeOptions}
                        value={form.values.format ?? ""}
                        onValueChange={(value) => {
                          const currentHeader = form.values.header;
                          if (currentHeader) {
                            const isFile = currentHeader instanceof File;
                            if (value === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT || isFile) {
                              form.setFieldValue("header", null);
                            }
                          }
                          form.setFieldValue("format", value);
                        }}
                        disabled={spmBtn || catalogBtn || mpmBtn}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={translations("Broadcast Type")} />
                        </SelectTrigger>
                        <SelectContent>
                          {broadcastTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="col-span-auto">
                    <div className="flex flex-col justify-center">
                      <BroadCastTypeValue form={form} type={form.values?.format} />
                    </div>
                  </div>
                </div>
              )}

            <div className="flex flex-col gap-0">
              <ReadonlyOverlay />
              {form.values?.category !== WaTemplateCategory.AUTHENTICATION && (
                <>
                  <div className="flex items-center gap-1 flex-nowrap">
                    <p className="text-sm font-medium">{translations("Body")}</p>
                    {requiredIcon}
                  </div>
                  <p className="text-[13px]">
                    {translations(
                      "Make your messages personal using variables and get more replies!",
                    )}
                  </p>
                  <TextFormateToolBar
                    applyFormatting={applyFormatting}
                    insertValue={insertValue}
                    undo={undo}
                    dynamicVariables={dynamicVariables}
                  />
                  <div className="relative">
                    <Textarea
                      ref={inputRef}
                      className="field-sizing-content rounded-t-none rounded-b-xl pr-[90px]"
                      placeholder={translations("Enter the text")}
                      rows={3}
                      onSelect={handleSelect}
                      {...form.getInputProps("body")}
                    />
                    <div className="pointer-events-none absolute right-2 bottom-2">
                      <LengthTracker length={form?.values?.body?.length} maxValue={1024} atStart />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-0">
              <ReadonlyOverlay />
              {form.values?.category !== WaTemplateCategory.AUTHENTICATION &&
                dynamicVariables?.map((data, index) => (
                  <Input
                    key={data}
                    placeholder={`${translations("Enter the content for")} {{${data}}}`}
                    {...form.getFieldProps(`example.${index}`)}
                  />
                ))}

              {form.getValues().templateType !== TemplateType.PAYMENT_CONFIRMATION &&
                form.getValues().templateType !== TemplateType.CAROUSEL && (
                  <>
                    {form.values?.category !== WaTemplateCategory.AUTHENTICATION ? (
                      <Field>
                        <FieldLabel>
                          <div>
                            <p className="text-sm font-medium">
                              {translations("Footer (Optional)")}
                            </p>
                            <p className="text-[13px]">
                              {translations(
                                "Footers are great to add any disclaimers or to add a thoughtful PS",
                              )}
                            </p>
                          </div>
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupInput
                            placeholder={translations("Footer")}
                            {...form.getFieldProps("footer")}
                          />
                          <InputGroupAddon align="inline-end">
                            <LengthTracker
                              length={form?.values?.footer?.length}
                              maxValue={60}
                              atStart
                            />
                          </InputGroupAddon>
                        </InputGroup>
                      </Field>
                    ) : (
                      <Field>
                        <FieldLabel>
                          <p className="text-sm font-medium">
                            {translations("Code Expiration (minutes)")}
                          </p>
                        </FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          placeholder={translations("Expiration time")}
                          value={form.values.code_expiration_minutes ?? ""}
                          onChange={(event) =>
                            form.setFieldValue(
                              "code_expiration_minutes",
                              Number(event.target.value),
                            )
                          }
                        />
                      </Field>
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
                          <div
                            className={cn("flex items-center", buttonInputStyles.buttonBox)}
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
                          </div>
                        ))}
                      </>
                    )}
                    {isOrderCreate && (
                      <>
                        <div className="flex items-center gap-1 flex-nowrap">
                          <p className="text-sm font-medium">{translations("Config")}</p>
                          {requiredIcon}
                        </div>
                        <Field>
                          <FieldLabel>
                            <div className="flex items-center gap-1 flex-nowrap">
                              <p className="text-sm font-medium">{translations("Name")}</p>
                              {requiredIcon}
                            </div>
                          </FieldLabel>
                          <Input placeholder={"name"} {...configForm.getFieldProps("name")} />
                        </Field>
                        <Field>
                          <FieldLabel>
                            <div className="flex items-center gap-1 flex-nowrap">
                              <p className="text-sm font-medium">{translations("Price")}</p>
                              {requiredIcon}
                            </div>
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            placeholder={translations("price")}
                            value={configForm.values.price ?? 0}
                            onChange={(event) =>
                              configForm.setFieldValue("price", Number(event.target.value))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>
                            <div className="flex items-center gap-1 flex-nowrap">
                              <p className="text-sm font-medium">{translations("Tax")}</p>
                              {requiredIcon}
                            </div>
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            placeholder={translations("tax")}
                            value={configForm.values.tax ?? 0}
                            onChange={(event) =>
                              configForm.setFieldValue("tax", Number(event.target.value))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>
                            <p className="text-sm font-medium">{translations("OrderType")}</p>
                          </FieldLabel>
                          <Select
                            items={orderTypeOptions}
                            value={configForm.values.orderType ?? ""}
                            onValueChange={(value) => configForm.setFieldValue("orderType", value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={translations("order type")} />
                            </SelectTrigger>
                            <SelectContent>
                              {orderTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldDescription>
                            When this field is passed in we hide the &quot;Review and Pay&quot;
                            button and only show the &quot;Pay Now&quot; button in the order details
                            bubble
                          </FieldDescription>
                        </Field>
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
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function isArrayInCorrectOrder(arr: string[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== (i + 1).toString()) {
      return false;
    }
  }
  return true;
}
