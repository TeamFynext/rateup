import { zodResolver } from "@hookform/resolvers/zod";
import { IconAsterisk, IconImageInPicture, IconInfoCircle } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useId } from "react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
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
import type { TemplateFormValues } from "@/components/whatsapp/templates/Details/template-form.ts";
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
import {
  OrderType,
  SubscriptionFeaturePathName,
  TemplateType,
  WaTemplateCategory,
  WaTemplateStatus,
} from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import {
  SAVE_HOTKEY,
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
  WHATSAPP_TEMPLATE_CATEGORY,
  WHATSAPP_TEMPLATE_LANGUAGE,
} from "@/utils/constants.ts";
import { uploadFile } from "@/utils/file-upload/upload.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import { getNestedProperty } from "@/utils/misc/obj.utils.ts";
import { toSelectOptions } from "@/utils/select-options.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";
import { parseStringWithVariables, parseTemplate } from "@/utils/whatsapp/templates.tsx";

/** Where saving a new template lands — the list the template belongs to. */
type BackTarget =
  | { to: "/dashboard/whatsapp/templates" }
  | { to: "/dashboard/loyalty/messages"; search: { tab: "templates" } };

const DEFAULT_BACK: BackTarget = { to: "/dashboard/whatsapp/templates" };

export function WhatsappTemplateById({
  forceTemplateType,
  backTo = DEFAULT_BACK,
}: Readonly<{
  forceTemplateType?: TemplateType;
  backTo?: BackTarget;
}>) {
  const uid = useId();
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
  /** Undo stack for the body text. */
  const contentHistory = useRef<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, toggle] = useToggle([true, false]);
  const { update } = useRouteParams();
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
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
  const configForm = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      price: 0,
      tax: 0,
      orderType: null,
      name: "",
    },
  });
  const values = form.watch();
  const configValues = configForm.watch();
  const formErrors = form.formState.errors;

  /**
   * Most writes here target runtime-built paths (`buttons.3.text`,
   * `defaultValues.catalog.mpm.sections.0.title`), which cannot be expressed as a
   * statically-known `FieldPath`. This keeps the cast in one place.
   */
  const setTemplateValue = (path: string, value: unknown) =>
    form.setValue(path as FieldPath<TemplateFormValues>, value as never, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  const registerField = (path: string) => form.register(path as FieldPath<TemplateFormValues>);
  const errorAt = (path: string) =>
    getNestedProperty<{ message?: string }>(formErrors, path)?.message;

  // Only the mutations are used. The list is still rendered from the watched `values`
  // rather than `fields`, because a row's rendering depends on values edited after it was
  // appended (e.g. a url containing COPY_CODE switches the row to the OTP editor), which
  // the `fields` snapshot would not reflect.
  const {
    append: appendButton,
    insert: insertButton,
    remove: removeButton,
  } = useFieldArray({ control: form.control, name: "buttons" });

  const isOrderCreate = values.templateType === TemplateType.ORDER_DETAILS;
  // Chat bubble background; the shadcn card token resolves per-theme.
  const bubbleBg = "var(--card)";

  useEffect(() => {
    if (editingItem) {
      form.reset(parseTemplate(editingItem) as TemplateFormValues);
      const selectedPhoneId =
        editingItem?.whatsappSettingsPhoneId ||
        editingItem?.defaultValues?.whatsappSettingsPhoneId ||
        "";
      setTemplateValue("whatsappSettingsPhoneId", selectedPhoneId);
      setTemplateValue("defaultValues.whatsappSettingsPhoneId", selectedPhoneId);
      configForm.reset(editingItem?.config);
      update({ templateId: editingItem?.data?.name });
    }
  }, [editingItem]);

  useEffect(() => {
    if (values.whatsappSettingsPhoneId !== values.defaultValues?.whatsappSettingsPhoneId) {
      setTemplateValue("defaultValues.whatsappSettingsPhoneId", values.whatsappSettingsPhoneId);
    }
  }, [values.whatsappSettingsPhoneId]);

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
    values.buttons.forEach((b) => {
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
  }, [values.buttons]);

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
      setTemplateValue("productCarousel", []);
      setTemplateValue("mediaCarousel", []);
    }
    switch (form.getValues().templateType) {
      case TemplateType.ORDER_DETAILS:
        setTemplateValue("category", "UTILITY");
        setTemplateValue("buttons", [
          {
            type: WHATSAPP_BUTTON_TYPE.ORDER_DETAILS,
            text: "Review and Pay",
          },
        ]);
        setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT);
        break;
      case TemplateType.PAYMENT_CONFIRMATION:
        setTemplateValue("category", "UTILITY");
        setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE);
        setTemplateValue("buttons", []);
        break;
      case TemplateType.CAROUSEL:
        setTemplateValue("category", "MARKETING");
        setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE);
        setTemplateValue("buttons", []);
        setTemplateValue("footer", "");
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
            (component: { type: string }) => component.type.toLowerCase() === "buttons",
          )?.buttons;
          setTemplateValue("buttons", buttons || []);
        } else {
          setTemplateValue("buttons", []);
        }
        break;
    }
  }, [form.getValues().templateType]);

  const createTemplateMutation = useCreateTemplateMutation(
    () => {
      form.reset();
      setIsSubmitting(false);
      navigate(backTo);
    },
    () => {
      setIsSubmitting(false);
    },
  );

  const { data: catalog } = useConnectedWaCatalog(values.whatsappSettingsPhoneId ?? "");
  const productRetailerIds = useMemo(
    () => catalog?.products?.map((p) => p.retailer_id ?? "") ?? [],
    [catalog],
  );
  useEffect(() => {
    // `catalogId` is absent whenever a saved template is loaded without one, so it has
    // to stay optional here — the empty-string check it used to do was redundant with
    // the inequality anyway.
    const selectedCatalogId = values.defaultValues?.catalog?.catalogId;
    if (catalog && selectedCatalogId !== catalog.catalogId)
      setTemplateValue("defaultValues.catalog.catalogId", catalog.catalogId);
  }, [catalog]);
  useEffect(() => {
    const variables = parseStringWithVariables(values.body);
    const current = values.example || [];

    if (current.length === variables.length) return;

    if (current.length > variables.length) {
      setTemplateValue("example", current.slice(0, variables.length));
    } else {
      const newExamples = [...current];
      while (newExamples.length < variables.length) {
        newExamples.push("");
      }
      setTemplateValue("example", newExamples);
    }
  }, [values.body]);
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
        navigate(backTo);
      }
    },
    () => {
      setIsSubmittingDraft(false);
    },
  );
  if (templateId && isPending) return <RateupLoader />;

  /** First validation message from an RHF error tree, for the toast. */
  function firstErrorMessage(errors: unknown): string | undefined {
    if (!errors || typeof errors !== "object") return undefined;
    for (const value of Object.values(errors as Record<string, unknown>)) {
      const message = (value as { message?: unknown } | null)?.message;
      if (typeof message === "string") return message;
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
    const dynamicVariableArray = parseStringWithVariables(values.body || "");
    const hasEmptyExamples = (values.example || []).some((val) => !val || val.trim() === "");

    if (dynamicVariableArray?.length > 0) {
      if (!isArrayInCorrectOrder(dynamicVariableArray)) {
        toast.error("Dynamic variables name should is sequential numeric order");
        return;
      } else if (values.example!.length !== dynamicVariableArray.length || hasEmptyExamples) {
        toast.error("Please provide example values for all dynamic variables");
        return;
      }
    }
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
      for (const card of values.mediaCarousel!) {
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
      const defaultValueCards = values.defaultValues!.productCarousel ?? [];
      values.productCarousel!.map((card, index) => {
        const cardIndex = defaultValueCards.findIndex((c) => c.cardIndex === index);
        if (cardIndex !== -1) {
          defaultValueCards[cardIndex]!.product_retailer_id = card.product_retailer_id;
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
        defaultValues[values.format?.toLowerCase() as keyof WaTemplateDefaultValues] = {
          link: publicImageLink,
          filename,
        };
        values.defaultValues = { ...values.defaultValues, ...defaultValues };
      }
      if (values.templateType === TemplateType.CAROUSEL) {
        await Promise.all(
          values.mediaCarousel!.map(async (card, index) => {
            if (card.header instanceof File) {
              const file = await uploadTemplateMedia(card.header);
              const publicImageLink = await uploadFile(card.header);
              values.mediaCarousel![index]!.header = file?.id ?? "";
              const defValues = values.defaultValues!.mediaCarousel ?? [];
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
        if (saveAsDraft) {
          saveTemplateAsDraftMutation.mutate({ ...values, id: editingItem.id });
        } else {
          updateTemplateMutation.mutate({ templateId: editingItem.id, templateData });
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
          : typeof getApiErrorMessage(error) === "string"
            ? getApiErrorMessage(error)
            : "error in uploading",
      );
    }
  }
  const handleSelect = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    setSelectedText(selectedText?.trim() ?? "");
  };
  const getNextVariable = () => {
    const variables = parseStringWithVariables(values.body);
    if (variables.length === 0) return "{{1}}";
    const numbers = variables.map(Number);
    const max = Math.max(...numbers);
    return `{{${max + 1}}}`;
  };
  const applyFormatting = (style: string) => {
    const content = values.body;
    if (style.startsWith("{{")) {
      insertValue(getNextVariable());
      return;
    }
    if (!selectedText) return;
    const formattedText = `${style}${selectedText}${style}`;
    contentHistory.current.push(content);
    const newContent = content.replace(selectedText, formattedText);
    setTemplateValue("body", newContent);
  };

  const undo = () => {
    if (contentHistory.current.length > 0) {
      const previousContent = contentHistory.current.pop()!;
      setTemplateValue("body", previousContent);
    }
  };

  const insertValue = (value: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + value + text.substring(end);
    setTemplateValue("body", newText);
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
      const btn = values?.buttons?.filter((data) => data.type === (e as WHATSAPP_BUTTON_TYPE));
      if (btn?.length > 0) {
        toast.error(`Only one button allowed for this type`);
        return;
      }
    }
    const newData = values.buttons ?? [];
    if (e === WHATSAPP_BUTTON_TYPE.ORDER_DETAILS) {
      const otherBtns = newData.find((b) => b.type !== WHATSAPP_BUTTON_TYPE.QUICK_REPLY);
      if (otherBtns) {
        toast.error(
          `Only quick reply buttons are allowed along with checkout button. Remove others to add checkout button`,
        );
        return;
      }
      setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE);
      setTemplateValue("defaultValues", {
        whatsappSettingsPhoneId:
          values.whatsappSettingsPhoneId || values.defaultValues?.whatsappSettingsPhoneId || "",
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
      appendButton(newObject);
    } else {
      insertButton(lastIndex + 1, newObject);
    }
    if (e === WHATSAPP_BUTTON_TYPE.SPM) {
      setTemplateValue("header", null);
      setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.PRODUCT);
    }
    if (e === WHATSAPP_BUTTON_TYPE.CATALOG) {
      setTemplateValue("header", null);
      setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE);
      setTemplateValue("category", "MARKETING");
    }
    if (e === WHATSAPP_BUTTON_TYPE.MPM) {
      setTemplateValue("header", "");
      setTemplateValue("format", WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT);
      setTemplateValue("category", "MARKETING");
    }
  };
  const deleteButton = (index: number) => {
    removeButton(index);
  };
  const dynamicVariables = parseStringWithVariables(values.body);

  const requiredIcon = (
    <sup>
      <IconAsterisk color="red" size={5} />
    </sup>
  );

  /** Blocks interaction with a section while the saved template is in read-only mode.
   *  Its container must be `relative`, otherwise the overlay escapes to the nearest
   *  positioned ancestor and covers the whole page (Preview / Edit buttons included). */
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
        {HeaderWithFormatting(values?.header ?? "", values?.format ?? "")}
        <p
          style={{
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
          }}
        >
          {TextWithFormatting(values?.body, values?.example, values?.category)}
        </p>
        <p
          className="text-muted-foreground"
          style={{
            wordBreak: "break-all",
          }}
        >
          {values?.category === WaTemplateCategory.AUTHENTICATION
            ? values?.code_expiration_minutes
              ? `Expires in ${values?.code_expiration_minutes} minutes.`
              : ""
            : values.footer}
        </p>
      </ResponseMessageContainer>
      {values?.buttons?.slice(0, 2).map((data) => (
        <QuickReplyButton
          text={data?.text ?? ""}
          key={data?.text}
          type={data.type}
          style={{ backgroundColor: bubbleBg }}
        />
      ))}
      {values?.buttons?.length > 2 && (
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
          {values.mediaCarousel?.map((card, index) => (
            <div
              className="flex w-45 flex-col gap-px"
              key={index}
              style={{ borderRadius: "10px", background: bubbleBg }}
            >
              {HeaderWithFormatting(card?.header ?? "", card?.format ?? "")}
              <p
                className="p-2.5"
                style={{
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                }}
              >
                {TextWithFormatting(card?.body, card?.example, values?.category)}
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
      <div
        className="flex flex-col gap-4"
        onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => handleSubmit(true)]])}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="truncate text-2xl font-semibold">
            {editingItem ? editingItem?.data?.name : translations("Create Template")}
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
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
        <div className="w-full overflow-auto rounded-lg bg-card p-4 shadow-md md:p-6">
          <div className="flex flex-col gap-6">
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
            <div className="flex flex-wrap items-end justify-between gap-4">
              <WaTemplateStatusBadge status={values.status} />
              {editingItem?.data?.id && (
                <LinkCopyElement
                  className="w-full max-w-xs"
                  link={editingItem?.data?.id}
                  value={editingItem?.data?.id}
                  label={translations("Template ID")}
                />
              )}
            </div>
            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReadonlyOverlay />
              <Field>
                <FieldLabel htmlFor={`${uid}-field`}>
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
                    id={`${uid}-field`}
                    placeholder={translations("Name")}
                    disabled={!!editingItem?.data?.id}
                    aria-invalid={!!formErrors.name}
                    {...registerField("name")}
                  />
                  <InputGroupAddon align="inline-end">
                    <LengthTracker length={values?.name?.length} maxValue={512} atStart />
                  </InputGroupAddon>
                </InputGroup>
                {formErrors.name && <FieldError>{formErrors.name.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-templatetype`}>
                  <div className="flex items-center gap-1 flex-nowrap">
                    <p className="text-sm font-medium">TemplateType</p>
                    {requiredIcon}
                  </div>
                </FieldLabel>
                <Select
                  items={templateTypeOptions}
                  value={values.templateType ?? ""}
                  onValueChange={(value) => setTemplateValue("templateType", value)}
                >
                  <SelectTrigger id={`${uid}-templatetype`} className="w-full">
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
                    <FieldLabel htmlFor={`${uid}-category`}>
                      <div className="flex items-center gap-1 flex-nowrap">
                        <p className="text-sm font-medium">Category</p>
                        {requiredIcon}
                      </div>
                    </FieldLabel>
                    <Select
                      items={categoryOptions}
                      value={values.category ?? ""}
                      onValueChange={(value) => setTemplateValue("category", value)}
                      disabled={isOrderCreate || catalogBtn || spmBtn || mpmBtn || checkoutBtn}
                    >
                      <SelectTrigger id={`${uid}-category`} className="w-full">
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
                <FieldLabel htmlFor={`${uid}-field-2`}>
                  <div className="flex items-center gap-1 flex-nowrap">
                    <p className="text-sm font-medium">{translations("Language")}</p>
                    {requiredIcon}
                  </div>
                </FieldLabel>
                <Select
                  items={languageOptions}
                  value={values.language ?? ""}
                  onValueChange={(value) => setTemplateValue("language", value)}
                >
                  <SelectTrigger id={`${uid}-field-2`} className="w-full">
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
                  value={values.whatsappSettingsPhoneId}
                  onChange={(value) => {
                    setTemplateValue("whatsappSettingsPhoneId", value ?? "");
                    setTemplateValue("defaultValues.whatsappSettingsPhoneId", value ?? "");
                  }}
                  label={translations("Account")}
                  className="h-10"
                />
              </div>
            </div>
            {values?.category !== WaTemplateCategory.AUTHENTICATION &&
              form.getValues().templateType !== TemplateType.PAYMENT_CONFIRMATION &&
              form.getValues().templateType !== TemplateType.CAROUSEL && (
                <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ReadonlyOverlay />
                  <div>
                    <Field>
                      <FieldLabel htmlFor={`${uid}-field-3`}>
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
                        value={values.format ?? ""}
                        onValueChange={(value) => {
                          const currentHeader = values.header;
                          if (currentHeader) {
                            const isFile = currentHeader instanceof File;
                            if (value === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT || isFile) {
                              setTemplateValue("header", null);
                            }
                          }
                          setTemplateValue("format", value);
                        }}
                        disabled={spmBtn || catalogBtn || mpmBtn}
                      >
                        <SelectTrigger id={`${uid}-field-3`} className="w-full">
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
                  <div className="flex flex-col justify-end">
                    <BroadCastTypeValue form={form} type={values?.format} />
                  </div>
                </div>
              )}

            <div className="relative flex flex-col gap-2">
              <ReadonlyOverlay />
              {values?.category !== WaTemplateCategory.AUTHENTICATION && (
                <>
                  <div>
                    <div className="flex items-center gap-1 flex-nowrap">
                      <p className="text-sm font-medium">{translations("Body")}</p>
                      {requiredIcon}
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {translations(
                        "Make your messages personal using variables and get more replies!",
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <TextFormateToolBar
                      applyFormatting={applyFormatting}
                      insertValue={insertValue}
                      undo={undo}
                      dynamicVariables={dynamicVariables}
                    />
                    <div className="relative">
                      <Textarea
                        // NOTE: the `registerField` spread below also sets `ref`,
                        // so `inputRef` stays null and `insertValue` no-ops.
                        // Left as-is; see the migration notes.
                        className="field-sizing-content rounded-t-none rounded-b-xl pr-22.5"
                        placeholder={translations("Enter the text")}
                        rows={3}
                        onSelect={handleSelect}
                        aria-invalid={!!formErrors.body}
                        {...registerField("body")}
                      />
                      <div className="pointer-events-none absolute right-2 bottom-2">
                        <LengthTracker length={values?.body?.length ?? 0} maxValue={1024} atStart />
                      </div>
                    </div>
                    {formErrors.body && <FieldError>{formErrors.body.message}</FieldError>}
                  </div>
                </>
              )}
            </div>
            <div className="relative flex flex-col gap-4">
              <ReadonlyOverlay />
              {values?.category !== WaTemplateCategory.AUTHENTICATION &&
                dynamicVariables?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {dynamicVariables.map((data, index) => (
                      <Field key={data} data-invalid={!!errorAt(`example.${index}`)}>
                        <Input
                          placeholder={`${translations("Enter the content for")} {{${data}}}`}
                          aria-invalid={!!errorAt(`example.${index}`)}
                          {...registerField(`example.${index}`)}
                        />
                        {errorAt(`example.${index}`) && (
                          <FieldError>{errorAt(`example.${index}`)}</FieldError>
                        )}
                      </Field>
                    ))}
                  </div>
                )}

              {form.getValues().templateType !== TemplateType.PAYMENT_CONFIRMATION &&
                form.getValues().templateType !== TemplateType.CAROUSEL && (
                  <>
                    {values?.category !== WaTemplateCategory.AUTHENTICATION ? (
                      <Field data-invalid={!!formErrors.footer}>
                        <FieldLabel htmlFor={`${uid}-field-4`}>
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
                            id={`${uid}-field-4`}
                            placeholder={translations("Footer")}
                            aria-invalid={!!formErrors.footer}
                            {...registerField("footer")}
                          />
                          <InputGroupAddon align="inline-end">
                            <LengthTracker length={values?.footer?.length} maxValue={60} atStart />
                          </InputGroupAddon>
                        </InputGroup>
                        {formErrors.footer && <FieldError>{formErrors.footer.message}</FieldError>}
                      </Field>
                    ) : (
                      <Field>
                        <FieldLabel htmlFor={`${uid}-field-5`}>
                          <p className="text-sm font-medium">
                            {translations("Code Expiration (minutes)")}
                          </p>
                        </FieldLabel>
                        <Input
                          id={`${uid}-field-5`}
                          type="number"
                          min={1}
                          max={90}
                          placeholder={translations("Expiration time")}
                          value={values.code_expiration_minutes ?? ""}
                          onChange={(event) =>
                            setTemplateValue("code_expiration_minutes", Number(event.target.value))
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
                      btnLen={values?.buttons?.length}
                      disabled={isOrderCreate}
                      category={values?.category}
                    />
                    {values?.buttons?.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {values?.buttons?.map((data, index) => (
                          <div
                            className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted p-3"
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
                      </div>
                    )}
                    {isOrderCreate && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-1 flex-nowrap">
                          <p className="text-sm font-medium">{translations("Config")}</p>
                          {requiredIcon}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <Field>
                            <FieldLabel htmlFor={`${uid}-field-6`}>
                              <div className="flex items-center gap-1 flex-nowrap">
                                <p className="text-sm font-medium">{translations("Name")}</p>
                                {requiredIcon}
                              </div>
                            </FieldLabel>
                            <Input
                              id={`${uid}-field-6`}
                              placeholder={"name"}
                              {...configForm.register("name")}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`${uid}-field-7`}>
                              <div className="flex items-center gap-1 flex-nowrap">
                                <p className="text-sm font-medium">{translations("Price")}</p>
                                {requiredIcon}
                              </div>
                            </FieldLabel>
                            <Input
                              id={`${uid}-field-7`}
                              type="number"
                              min={0}
                              placeholder={translations("price")}
                              value={configValues.price ?? 0}
                              onChange={(event) =>
                                configForm.setValue("price", Number(event.target.value), {
                                  shouldDirty: true,
                                })
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`${uid}-field-8`}>
                              <div className="flex items-center gap-1 flex-nowrap">
                                <p className="text-sm font-medium">{translations("Tax")}</p>
                                {requiredIcon}
                              </div>
                            </FieldLabel>
                            <Input
                              id={`${uid}-field-8`}
                              type="number"
                              min={0}
                              placeholder={translations("tax")}
                              value={configValues.tax ?? 0}
                              onChange={(event) =>
                                configForm.setValue("tax", Number(event.target.value), {
                                  shouldDirty: true,
                                })
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`${uid}-field-9`}>
                              <p className="text-sm font-medium">{translations("OrderType")}</p>
                            </FieldLabel>
                            <Select
                              items={orderTypeOptions}
                              value={configValues.orderType ?? ""}
                              onValueChange={(value) =>
                                configForm.setValue("orderType", value as OrderType, {
                                  shouldDirty: true,
                                })
                              }
                            >
                              <SelectTrigger id={`${uid}-field-9`} className="w-full">
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
                              button and only show the &quot;Pay Now&quot; button in the order
                              details bubble
                            </FieldDescription>
                          </Field>
                        </div>
                      </div>
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
