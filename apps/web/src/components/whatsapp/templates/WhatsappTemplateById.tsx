import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@rateup/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Textarea } from "@rateup/ui/components/textarea";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChartBar,
  IconAsterisk,
  IconBan,
  IconFileText,
  IconLetterT,
  IconMapPin,
  IconPhoto,
  IconVideo,
  IconCopy,
  IconDeviceFloppy,
  IconImageInPicture,
  IconInfoCircle,
  IconLock,
  IconPencil,
  IconSend,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useId } from "react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { z } from "zod/v4";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { uploadTemplateMedia } from "@/backend/whatsapp/whatsapp.api";
import type { LibraryTemplate } from "@/backend/whatsapp/whatsapp.api";
import {
  useCreateTemplateFromLibraryMutation,
  useCreateTemplateMutation,
  useSaveTemplateAsDraftMutation,
  useUpdateTemplateMutation,
  useWaTemplateById,
} from "@/backend/whatsapp/whatsapp.query";
import { PAGE_TITLE } from "@/components/common/page-heading.tsx";
import { WizardSection } from "@/components/dashboard/automation/components/wizard/WizardSection.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { Stepper } from "@/components/ui/stepper.tsx";
import { BroadCastTypeValue } from "@/components/whatsapp/templates/Details/BroadCastTypeValue.tsx";
import ButtonInput from "@/components/whatsapp/templates/Details/ButtonInput.tsx";
import { ButtonSelection } from "@/components/whatsapp/templates/Details/ButtonSelectionMenu.tsx";
import CardCarousel, {
  ProductCardCarouselPreview,
} from "@/components/whatsapp/templates/Details/CardCarousel.tsx";
import {
  firstErrorMessage,
  friendlyWhatsAppError,
  type TemplateFormValues,
} from "@/components/whatsapp/templates/Details/template-form.ts";
import { TextFormateToolBar } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";
import type { WaTemplateDefaultValues } from "@/components/whatsapp/templates/Schema/templateSchema.ts";
import {
  configSchema,
  templateSchema,
} from "@/components/whatsapp/templates/Schema/templateSchema.ts";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge.tsx";
import type { LibraryInputs } from "@/components/whatsapp/templates/wizard/library.ts";
import {
  EMPTY_LIBRARY_INPUTS,
  humanize,
  libraryInputsBlocker,
  libraryLanguage,
  libraryToFormValues,
  starterToFormValues,
  toTemplateName,
} from "@/components/whatsapp/templates/wizard/library.ts";
import { LibraryDetailsStep } from "@/components/whatsapp/templates/wizard/LibraryDetailsStep.tsx";
import type {
  StartSource,
  TemplateStart,
} from "@/components/whatsapp/templates/wizard/StartStep.tsx";
import { StartStep } from "@/components/whatsapp/templates/wizard/StartStep.tsx";
import { WaCarouselCard, WaTemplateMessage } from "@/components/whatsapp/wa-template-bubble.tsx";
import { WhatsAppChatShell } from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { useToggle } from "@/hooks/use-toggle.ts";
import { cn } from "@/lib/utils.ts";
import {
  OrderType,
  SubscriptionFeaturePathName,
  TemplateType,
  WaTemplateCategory,
  WaTemplateStatus,
  WhatsappSettingsStatus,
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

const HEADER_LABEL: Record<string, string> = {
  NONE: "None",
  TEXT: "Text",
  IMAGE: "Image",
  VIDEO: "Video",
  DOCUMENT: "Document",
  LOCATION: "Location",
};

const HEADER_ICON: Record<string, typeof IconLetterT> = {
  NONE: IconBan,
  TEXT: IconLetterT,
  IMAGE: IconPhoto,
  VIDEO: IconVideo,
  DOCUMENT: IconFileText,
  LOCATION: IconMapPin,
};

type TemplateStep = "start" | "setup" | "content" | "buttons" | "details" | "review";

const STEP_LABEL: Record<TemplateStep, string> = {
  start: "Start",
  setup: "Setup",
  content: "Message",
  buttons: "Buttons",
  details: "Details",
  review: "Review",
};

/** What Continue validates on each step; the rest is checked on save. */
const STEP_FIELDS: Record<TemplateStep, readonly string[]> = {
  start: [],
  setup: ["name", "templateType", "category", "language"],
  content: ["format", "header", "body", "example", "footer", "mediaCarousel", "productCarousel"],
  buttons: ["buttons"],
  details: [],
  review: [],
};

const CATEGORY_HINT: Record<string, string> = {
  MARKETING: "Offers, announcements and anything promotional.",
  UTILITY: "Updates about something the customer did: orders, bookings, payments.",
  AUTHENTICATION: "One-time codes for signing in or verifying.",
};

function stepHeading(
  step: TemplateStep,
  { isEdit, fromLibrary }: { isEdit: boolean; fromLibrary: boolean },
) {
  switch (step) {
    case "start":
      return {
        title: "Start your template",
        description:
          "Use one of Meta's ready-written templates, one of ours, or write your own. You can change it in the next steps.",
      };
    case "setup":
      return {
        title: "Name it and choose the number",
        description: fromLibrary
          ? "The name is how you'll find it later. Meta's library sets the category and language."
          : "The name is how you'll find it later; customers never see it.",
      };
    case "content":
      return {
        title: "Write the message",
        description:
          "Use variables like {{1}} for details that change on every send, such as a name or an order number.",
      };
    case "buttons":
      return {
        title: "Add buttons",
        description: "Optional. Quick replies, links, calls, flows or a checkout.",
      };
    case "details":
      return {
        title: "Fill in the details",
        description: "Meta wrote the message. Tell it where the buttons go.",
      };
    case "review":
      return isEdit
        ? { title: "Review and save", description: "Saving sends the changes to Meta for review." }
        : {
            title: "Review and submit",
            description: "Read it once as your customer will. Click Change to fix anything.",
          };
  }
}

export function WhatsappTemplateById({
  forceTemplateType,
  backTo = DEFAULT_BACK,
  initialValues,
}: Readonly<{
  forceTemplateType?: TemplateType;
  backTo?: BackTarget;
  /**
   * Opening state for a template that does not exist yet, over the blank defaults below —
   * how the loyalty Messages page hands a starter message to the editor. Read once, as
   * RHF reads `defaultValues`, so it has to be resolvable on the first render.
   */
  initialValues?: Partial<TemplateFormValues>;
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
  /** Undo stack for the body text. */
  const contentHistory = useRef<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, toggle] = useToggle([true, false]);
  const { update } = useRouteParams();
  /** A new template's starting values; also what "Start from scratch" goes back to. */
  const blankValues = (whatsappSettingsPhoneId = "") => ({
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
    whatsappSettingsPhoneId,
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
      whatsappSettingsPhoneId,
    },
  });
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      ...blankValues(),
      ...initialValues,
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

  // ── Wizard ────────────────────────────────────────────────────────────────
  const isEdit = Boolean(templateId);
  const isReadOnly = Boolean(editingItem?.data?.id && value);
  // A starter handed in by the caller (loyalty Messages) has already chosen what to start from.
  const skipStart = isEdit || Boolean(initialValues);
  const [start, setStart] = useState<TemplateStart | null>(null);
  const [startSource, setStartSource] = useState<StartSource>("library");
  /** The library entry being created as-is; cleared by "Customize". */
  const [libraryEntry, setLibraryEntry] = useState<LibraryTemplate | null>(null);
  const [libraryInputs, setLibraryInputs] = useState<LibraryInputs>(EMPTY_LIBRARY_INPUTS);
  const createFromLibrary = useCreateTemplateFromLibraryMutation();

  const hasButtonsStep =
    values.templateType !== TemplateType.PAYMENT_CONFIRMATION &&
    values.templateType !== TemplateType.CAROUSEL;
  const steps: TemplateStep[] = [
    ...(skipStart ? [] : ["start" as const]),
    "setup",
    ...(libraryEntry
      ? ["details" as const]
      : (["content", ...(hasButtonsStep ? ["buttons" as const] : [])] as TemplateStep[])),
    "review",
  ];
  const [step, setStep] = useState<TemplateStep>(skipStart ? "setup" : "start");
  const [furthest, setFurthest] = useState(isEdit ? Number.POSITIVE_INFINITY : 0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stepIndex = Math.max(steps.indexOf(step), 0);
  const isLastStep = stepIndex === steps.length - 1;

  const goTo = (next: TemplateStep) => {
    // A step the template no longer has (buttons on a carousel) lands on the nearest one.
    const target = steps.includes(next) ? next : steps[Math.min(stepIndex, steps.length - 1)]!;
    setStep(target);
    setFurthest((prev) => Math.max(prev, steps.indexOf(target)));
    bodyRef.current?.scrollTo({ top: 0 });
  };

  // A new template starts on the first connected number, so the library can be browsed
  // without a detour through set-up.
  const { data: waAccounts } = useWaSettings();
  useEffect(() => {
    if (isEdit || form.getValues("whatsappSettingsPhoneId")) return;
    const first = waAccounts?.find(
      (account) => account.status !== WhatsappSettingsStatus.DISCONNECTED,
    );
    if (first?.phoneId) {
      setTemplateValue("whatsappSettingsPhoneId", first.phoneId);
      setTemplateValue("defaultValues.whatsappSettingsPhoneId", first.phoneId);
    }
  }, [waAccounts, isEdit]);

  const pickStart = (picked: TemplateStart) => {
    const channel = form.getValues("whatsappSettingsPhoneId") ?? "";
    const base = {
      ...blankValues(channel),
      templateType: forceTemplateType || TemplateType.GENERAL_NOTIFICATION,
    };
    setStart(picked);
    setLibraryInputs(EMPTY_LIBRARY_INPUTS);
    // A new starting point is a new template: nothing past Start has been done for it,
    // even if the reader got further with the last pick.
    setFurthest(0);
    switch (picked.kind) {
      case "scratch":
        setLibraryEntry(null);
        form.reset(base);
        // Nothing to look at on this step after a blank pick, so it moves straight on.
        setStep("setup");
        setFurthest(1);
        break;
      case "starter":
        setLibraryEntry(null);
        form.reset({ ...base, ...starterToFormValues(picked.starter) });
        break;
      case "library":
        setLibraryEntry(picked.entry);
        form.reset({
          ...base,
          ...libraryToFormValues(picked.entry, EMPTY_LIBRARY_INPUTS),
          name: toTemplateName(picked.entry.name),
        });
        break;
    }
  };

  /** Leaves the library's wording for an ordinary template the reader can edit. */
  const customizeLibraryEntry = () => {
    if (!libraryEntry) return;
    setTemplateValue("buttons", libraryToFormValues(libraryEntry, libraryInputs).buttons);
    setLibraryEntry(null);
    setStep("content");
    // Message and Buttons replace Details, and neither has been done yet. Steps are
    // counted by position: Start, Setup, then Message at 2.
    setFurthest(2);
    bodyRef.current?.scrollTo({ top: 0 });
    toast.info("It's now your own template, so Meta will review it before it can be sent.");
  };

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

  async function handleSubmit(saveAsDraft: boolean = false) {
    const isValid = await form.trigger();
    if (!isValid) {
      goTo(stepForError(form.formState.errors));
      toast.error(
        firstErrorMessage(form.formState.errors) ?? "Please check the template and try again.",
      );
      return;
    }
    if (isOrderCreate) {
      const configIsValid = await configForm.trigger();
      if (!configIsValid) {
        toast.error(
          firstErrorMessage(configForm.formState.errors) ??
            "Please check the template and try again.",
        );
        return;
      }
    }
    const dynamicVariableArray = parseStringWithVariables(values.body || "");
    const hasEmptyExamples = (values.example || []).some((val) => !val || val.trim() === "");

    if (dynamicVariableArray?.length > 0) {
      if (!isArrayInCorrectOrder(dynamicVariableArray)) {
        toast.error("Dynamic variables name should is sequential numeric order");
        goTo("content");
        return;
      } else if (values.example!.length !== dynamicVariableArray.length || hasEmptyExamples) {
        toast.error("Please provide example values for all dynamic variables");
        goTo("content");
        return;
      }
    }
    if (values?.buttons?.length > 12) {
      toast.error(translations("Max number of button in buttons should be 12"));
      goTo("buttons");
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
          goTo("buttons");
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
      const apiMessage = typeof error === "string" ? error : getApiErrorMessage(error);
      toast.error(
        typeof apiMessage === "string"
          ? friendlyWhatsAppError(apiMessage)
          : "Couldn't save the template. Please try again.",
      );
    }
  }
  /** Writes the body and restores the caret, which `setValue` would otherwise send to the end. */
  const writeBody = (text: string, cursor: number) => {
    setTemplateValue("body", text);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  };

  const getNextVariable = () => {
    const variables = parseStringWithVariables(values.body);
    if (variables.length === 0) return "{{1}}";
    const numbers = variables.map(Number);
    const max = Math.max(...numbers);
    return `{{${max + 1}}}`;
  };
  const applyFormatting = (style: string) => {
    if (style.startsWith("{{")) {
      insertValue(getNextVariable());
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    // The textarea keeps its selection range after focus moves to the toolbar button,
    // so the range is read from the element rather than mirrored into state.
    const { selectionStart: start, selectionEnd: end, value: text } = input;
    if (start === end) return;
    contentHistory.current.push(text);
    writeBody(
      text.slice(0, start) + style + text.slice(start, end) + style + text.slice(end),
      end + style.length * 2,
    );
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
    writeBody(text.slice(0, start) + value + text.slice(end), start + value.length);
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
  const { ref: registerBodyRef, ...bodyField } = registerField("body");

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

  // Placeholder samples, keyed the way the body numbers them.
  const bodySamples = Object.fromEntries(
    (values.example ?? []).map((sample, index) => [String(index + 1), sample]),
  );
  const isAuthPreview = values?.category === WaTemplateCategory.AUTHENTICATION;
  const hasOrderCard = isOrderCreate || values.templateType === TemplateType.PAYMENT_CONFIRMATION;
  const headerFormat = values.format ?? "NONE";
  const messageContent = (
    <div className="flex flex-col gap-2 px-2 py-3">
      <WaTemplateMessage
        aboveBody={
          hasOrderCard ? (
            <div className="flex flex-col gap-1.5 rounded-md bg-[#f5f6f6] p-2 text-[12px] text-[#111b21] dark:bg-[#1d282f] dark:text-[#e9edef]">
              <p className="text-[#667781] dark:text-[#8696a0]">
                {translations("ORDER")} #{"{{Order number}}"}
              </p>
              <div className="flex items-center gap-2">
                <IconImageInPicture className="size-8 shrink-0 text-[#8696a0]" aria-hidden />
                <div>
                  <p>{"{{Product name}}"}</p>
                  <p className="text-[#667781] dark:text-[#8696a0]">
                    {translations("Quantity")} {"{{#}}"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-[#d1d7db] pt-1.5 dark:border-[#2a3942]">
                <p>{translations("Total")}</p>
                <p>{"{{Amount}}"}</p>
              </div>
            </div>
          ) : undefined
        }
        header={
          isAuthPreview || headerFormat === "NONE"
            ? null
            : {
                format: headerFormat,
                text: typeof values.header === "string" ? values.header : undefined,
                media: values.header,
              }
        }
        // Authentication templates carry Meta's fixed wording, not the business's.
        body={
          isAuthPreview
            ? "*{{1}}* is your verification code. For your security, do not share this code."
            : values.body
        }
        samples={isAuthPreview ? { "1": "123456" } : bodySamples}
        footer={
          isAuthPreview
            ? values.code_expiration_minutes
              ? `This code expires in ${values.code_expiration_minutes} minutes.`
              : null
            : values.footer || null
        }
        buttons={values.buttons}
      />
      {(values.mediaCarousel?.length ?? 0) > 0 || (values.productCarousel?.length ?? 0) > 0 ? (
        <div className="-mx-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {values.mediaCarousel?.map((card, index) => (
            <WaCarouselCard
              key={index}
              header={{ format: card?.format ?? "IMAGE", media: card?.header }}
              body={card?.body}
              samples={Object.fromEntries(
                (card?.example ?? []).map((sample, i) => [String(i + 1), sample]),
              )}
              buttons={card?.buttons}
            />
          ))}
          <ProductCardCarouselPreview form={form} catalog={catalog} />
        </div>
      ) : null}
    </div>
  );

  const heading = stepHeading(step, { isEdit, fromLibrary: Boolean(libraryEntry) });
  const isCarousel = values.templateType === TemplateType.CAROUSEL;
  const isPaymentConfirmation = values.templateType === TemplateType.PAYMENT_CONFIRMATION;
  const isAuthentication = values?.category === WaTemplateCategory.AUTHENTICATION;

  let blocker: string | null = null;
  if (step === "start" && !start) blocker = "Pick a template, or start from scratch";
  if (step === "setup" && !isEdit && !values.whatsappSettingsPhoneId) {
    blocker = "Pick the WhatsApp number it's sent from";
  }
  if (step === "details" && libraryEntry)
    blocker = libraryInputsBlocker(libraryEntry, libraryInputs);

  const goNext = async () => {
    const next = steps[stepIndex + 1];
    if (!next || blocker) return;
    const fields = STEP_FIELDS[step];
    const valid = fields.length
      ? await form.trigger(fields as FieldPath<TemplateFormValues>[], { shouldFocus: true })
      : true;
    if (!valid) {
      toast.error(firstErrorMessage(form.formState.errors) ?? "Some fields need attention");
      return;
    }
    goTo(next);
  };
  const goBack = () => {
    const previous = steps[stepIndex - 1];
    if (previous) goTo(previous);
  };

  const submitLibrary = async () => {
    if (!libraryEntry) return;
    const nameValid = await form.trigger("name");
    const missing = libraryInputsBlocker(libraryEntry, libraryInputs);
    if (!nameValid || missing) {
      toast.error(missing ?? formErrors.name?.message ?? "Check the template name");
      goTo(nameValid ? "details" : "setup");
      return;
    }
    createFromLibrary.mutate(
      {
        whatsappSettingsPhoneId: values.whatsappSettingsPhoneId ?? "",
        name: values.name,
        libraryTemplateName: libraryEntry.name,
        language: libraryEntry.language,
        category: libraryEntry.category,
        templateType: forceTemplateType,
        buttons: libraryEntry.required_inputs.buttons.map((required) => {
          const given = libraryInputs.buttons[required.index];
          return {
            index: required.index,
            type: required.type,
            url: given?.url?.trim() || undefined,
            urlSuffixExample: given?.urlSuffixExample?.trim() || undefined,
            phoneNumber: given?.phoneNumber?.trim() || undefined,
          };
        }),
        bodyInputs: Object.keys(libraryInputs.body).length ? libraryInputs.body : undefined,
      },
      { onSuccess: () => navigate(backTo) },
    );
  };

  const saveError =
    updateTemplateMutation.error?.message ||
    saveTemplateAsDraftMutation.error?.message ||
    createTemplateMutation.error?.message;
  const templateName = editingItem?.data?.name || values.name;
  // Only steps the reader has reached are clickable; a saved template opens them all.
  const canSave = !isReadOnly && (isEdit || isLastStep);
  // A draft can be kept from any step once there is something to keep; order templates
  // never had one. A library pick is kept as an ordinary draft of Meta's wording, since
  // Meta only creates library templates in one go.
  const canDraft = !isReadOnly && !isOrderCreate && step !== "start";

  const setupStep = (
    <div className="relative flex flex-col gap-6">
      <ReadonlyOverlay />
      <Field data-invalid={!!formErrors.name}>
        <FieldLabel htmlFor={`${uid}-field`}>
          <span className="flex flex-nowrap items-center gap-1">
            {translations("Template Name")}
            {requiredIcon}
          </span>
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={`${uid}-field`}
            placeholder="order_shipped"
            disabled={!!editingItem?.data?.id}
            aria-invalid={!!formErrors.name}
            {...registerField("name")}
          />
          <InputGroupAddon align="inline-end">
            <LengthTracker length={values?.name?.length} maxValue={512} atStart />
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>
          {translations("Lower-case letters and underscores only")}. Customers never see it.
        </FieldDescription>
        {formErrors.name && <FieldError>{formErrors.name.message}</FieldError>}
      </Field>
      <Field>
        <FieldLabel>
          <span className="flex flex-nowrap items-center gap-1">
            WhatsApp number
            {requiredIcon}
          </span>
        </FieldLabel>
        <AccountSelector
          value={values.whatsappSettingsPhoneId}
          onChange={(value) => {
            setTemplateValue("whatsappSettingsPhoneId", value ?? "");
            setTemplateValue("defaultValues.whatsappSettingsPhoneId", value ?? "");
          }}
          hideLabel
          optional={false}
          disabled={!!editingItem?.data?.id}
          className="!h-10 w-full !text-sm !text-foreground"
        />
        <FieldDescription>
          {editingItem?.data?.id
            ? "A submitted template stays on the number it was created on."
            : "The template belongs to this number's WhatsApp account."}
        </FieldDescription>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!isPaymentConfirmation && !isCarousel && (
          <Field>
            <FieldLabel htmlFor={`${uid}-category`}>
              <span className="flex flex-nowrap items-center gap-1">
                Category
                {requiredIcon}
              </span>
            </FieldLabel>
            <Select
              items={categoryOptions}
              value={values.category ?? ""}
              onValueChange={(value) => setTemplateValue("category", value)}
              disabled={
                Boolean(libraryEntry) ||
                isOrderCreate ||
                catalogBtn ||
                spmBtn ||
                mpmBtn ||
                checkoutBtn
              }
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
            <FieldDescription>
              {CATEGORY_HINT[values.category] ?? "Meta prices and reviews by category."}
            </FieldDescription>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={`${uid}-field-2`}>
            <span className="flex flex-nowrap items-center gap-1">
              {translations("Language")}
              {requiredIcon}
            </span>
          </FieldLabel>
          <Select
            items={languageOptions}
            value={values.language ?? ""}
            onValueChange={(value) => setTemplateValue("language", value)}
            disabled={Boolean(libraryEntry)}
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
          {libraryEntry && (
            <FieldDescription>Set by the library entry you picked.</FieldDescription>
          )}
        </Field>
      </div>
      {!libraryEntry && (
        <Field>
          <FieldLabel htmlFor={`${uid}-templatetype`}>
            <span className="flex flex-nowrap items-center gap-1">
              Template type
              {requiredIcon}
            </span>
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
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Carousel, order details and payment confirmation change what the next steps ask for.
          </FieldDescription>
        </Field>
      )}
    </div>
  );

  const contentStep = (
    <div className="relative flex flex-col gap-8">
      <ReadonlyOverlay />
      {!isAuthentication && !isPaymentConfirmation && !isCarousel && (
        <WizardSection
          title="Header"
          hint="Optional. A bold line of text, or an image, video or document above the message."
        >
          <div
            role="radiogroup"
            aria-label={translations("Broadcast header")}
            className="flex flex-wrap gap-2"
          >
            {broadcastTypeOptions.map((option) => {
              const Icon = HEADER_ICON[option.value] ?? IconLetterT;
              const on = values.format === option.value;
              const locked = spmBtn || catalogBtn || mpmBtn;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked && !on}
                  onClick={() => {
                    const currentHeader = values.header;
                    if (currentHeader) {
                      const isFile = currentHeader instanceof File;
                      if (option.value === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT || isFile) {
                        setTemplateValue("header", null);
                      }
                    }
                    setTemplateValue("format", option.value);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors outline-none",
                    "focus-visible:ring-ring focus-visible:ring-2 disabled:opacity-50",
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {HEADER_LABEL[option.value] ?? humanize(option.value)}
                </button>
              );
            })}
          </div>
          <BroadCastTypeValue form={form} type={values?.format} />
        </WizardSection>
      )}

      {!isAuthentication && (
        <WizardSection
          title={
            <span className="flex flex-nowrap items-center gap-1">
              {translations("Body")}
              {requiredIcon}
            </span>
          }
          hint={translations("Make your messages personal using variables and get more replies!")}
        >
          <div className="flex flex-col">
            <TextFormateToolBar
              applyFormatting={applyFormatting}
              insertValue={insertValue}
              undo={undo}
              dynamicVariables={dynamicVariables}
            />
            <div className="relative">
              <Textarea
                className="field-sizing-content min-h-32 rounded-t-none rounded-b-xl pr-22.5"
                placeholder={translations("Enter the text")}
                rows={5}
                aria-invalid={!!formErrors.body}
                {...bodyField}
                // The toolbar inserts at the caret, so the element has to be reachable
                // as well as registered: `registerField` also sets `ref`, and spreading
                // it alone left `inputRef` null and every insert a no-op.
                ref={(element) => {
                  registerBodyRef(element);
                  inputRef.current = element;
                }}
              />
              <div className="pointer-events-none absolute right-2 bottom-2">
                <LengthTracker length={values?.body?.length ?? 0} maxValue={1024} atStart />
              </div>
            </div>
            {formErrors.body && <FieldError>{formErrors.body.message}</FieldError>}
          </div>
        </WizardSection>
      )}

      {!isAuthentication && dynamicVariables?.length > 0 && (
        <WizardSection
          title="Sample values"
          hint="Meta reviews the template with these. They are examples only; real values are filled in on each send."
        >
          {dynamicVariables.map((data, index) => (
            <Field key={data} data-invalid={!!errorAt(`example.${index}`)}>
              <InputGroup>
                <InputGroupAddon className="font-mono text-xs">{`{{${data}}}`}</InputGroupAddon>
                <InputGroupInput
                  placeholder={`${translations("Enter the content for")} {{${data}}}`}
                  aria-invalid={!!errorAt(`example.${index}`)}
                  {...registerField(`example.${index}`)}
                />
              </InputGroup>
              {errorAt(`example.${index}`) && (
                <FieldError>{errorAt(`example.${index}`)}</FieldError>
              )}
            </Field>
          ))}
        </WizardSection>
      )}

      {!isPaymentConfirmation && !isCarousel && !isAuthentication && (
        <Field data-invalid={!!formErrors.footer}>
          <FieldLabel htmlFor={`${uid}-field-4`}>{translations("Footer (Optional)")}</FieldLabel>
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
          <FieldDescription>
            {translations("Footers are great to add any disclaimers or to add a thoughtful PS")}
          </FieldDescription>
          {formErrors.footer && <FieldError>{formErrors.footer.message}</FieldError>}
        </Field>
      )}
      {!isPaymentConfirmation && !isCarousel && isAuthentication && (
        <Field>
          <FieldLabel htmlFor={`${uid}-field-5`}>
            {translations("Code Expiration (minutes)")}
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
          <FieldDescription>
            Authentication templates use Meta's fixed wording; the code and its expiry are all you
            set.
          </FieldDescription>
        </Field>
      )}

      {isCarousel && (
        <WizardSection title="Cards">
          <CardCarousel form={form} catalog={catalog} productRetailerIds={productRetailerIds} />
        </WizardSection>
      )}
    </div>
  );

  const buttonsStep = (
    <div className="relative flex flex-col gap-6">
      <ReadonlyOverlay />
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
      {values?.buttons?.length > 0 ? (
        <div className="flex flex-col gap-3">
          {values?.buttons?.map((data, index) => (
            <div
              className="border-border bg-muted flex flex-wrap items-end gap-3 rounded-xl border p-3"
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
      ) : (
        <p className="text-muted-foreground text-sm">
          No buttons yet. They're optional — continue without them if the message stands on its own.
        </p>
      )}
      {isOrderCreate && (
        <WizardSection title={translations("Config")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={`${uid}-field-6`}>
                <span className="flex flex-nowrap items-center gap-1">
                  {translations("Name")}
                  {requiredIcon}
                </span>
              </FieldLabel>
              <Input id={`${uid}-field-6`} placeholder={"name"} {...configForm.register("name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-7`}>
                <span className="flex flex-nowrap items-center gap-1">
                  {translations("Price")}
                  {requiredIcon}
                </span>
              </FieldLabel>
              <Input
                id={`${uid}-field-7`}
                type="number"
                min={0}
                placeholder={translations("price")}
                value={configValues.price ?? 0}
                onChange={(event) =>
                  configForm.setValue("price", Number(event.target.value), { shouldDirty: true })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-8`}>
                <span className="flex flex-nowrap items-center gap-1">
                  {translations("Tax")}
                  {requiredIcon}
                </span>
              </FieldLabel>
              <Input
                id={`${uid}-field-8`}
                type="number"
                min={0}
                placeholder={translations("tax")}
                value={configValues.tax ?? 0}
                onChange={(event) =>
                  configForm.setValue("tax", Number(event.target.value), { shouldDirty: true })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-9`}>{translations("OrderType")}</FieldLabel>
              <Select
                items={orderTypeOptions}
                value={configValues.orderType ?? ""}
                onValueChange={(value) =>
                  configForm.setValue("orderType", value as OrderType, { shouldDirty: true })
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
                When this field is passed in we hide the &quot;Review and Pay&quot; button and only
                show the &quot;Pay Now&quot; button in the order details bubble
              </FieldDescription>
            </Field>
          </div>
        </WizardSection>
      )}
    </div>
  );

  const pickedAccount = waAccounts?.find(
    (account) => account.phoneId === values.whatsappSettingsPhoneId,
  );
  const accountLabel = pickedAccount
    ? [pickedAccount.phoneDisplayName, pickedAccount.phone].filter(Boolean).join(" · ")
    : "—";
  const reviewRows: { label: string; value: React.ReactNode; step: TemplateStep }[] = [
    { label: "Name", value: values.name || "—", step: "setup" },
    { label: "WhatsApp number", value: accountLabel, step: "setup" },
    { label: "Category", value: humanize(values.category), step: "setup" },
    { label: "Language", value: values.language, step: "setup" },
    ...(libraryEntry
      ? [
          {
            label: "Source",
            value: `Meta's library · ${humanize(libraryEntry.name)}`,
            step: "start" as const,
          },
        ]
      : [{ label: "Type", value: humanize(values.templateType), step: "setup" as const }]),
  ];
  const reviewStep = (
    <div className="flex flex-col gap-6">
      {saveError && (
        <Alert variant="destructive">
          <IconInfoCircle />
          <AlertDescription>{friendlyWhatsAppError(saveError)}</AlertDescription>
        </Alert>
      )}
      <dl className="ring-foreground/10 bg-card divide-border divide-y rounded-xl ring-1">
        {reviewRows.map((row) => (
          <div key={row.label} className="flex items-center gap-4 px-4 py-3 text-sm">
            <dt className="text-muted-foreground w-36 shrink-0">{row.label}</dt>
            <dd className="min-w-0 flex-1 truncate font-medium">{row.value}</dd>
            {steps.includes(row.step) && !isReadOnly && (
              <Button type="button" variant="link" size="sm" onClick={() => goTo(row.step)}>
                Change
              </Button>
            )}
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-[13px]">
        {libraryEntry?.pre_approved
          ? "Meta pre-approved this wording, so it can be sent as soon as it's created."
          : "Meta reviews every new template, usually within minutes and at most 24 hours. Its status shows on the Templates page."}
      </p>
    </div>
  );

  const backLabel = backTo.to === DEFAULT_BACK.to ? "Templates" : "Loyalty templates";

  return (
    <div
      className="bg-background flex h-full min-h-0 flex-col"
      onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => canDraft && handleSubmit(true)]])}
    >
      {/* The chrome the automation and campaign wizards use: a 56px bar over the steps. */}
      <header className="border-border bg-card flex h-14 shrink-0 items-center justify-between gap-4 border-b px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            {...backTo}
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-[13px]"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            {backLabel}
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            /
          </span>
          <span className="font-display truncate text-[15px] font-semibold">
            {templateName || (isEdit ? "Untitled template" : translations("Create Template"))}
          </span>
          {isEdit && <WaTemplateStatusBadge status={values.status} />}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {editingItem?.data?.id && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground hidden font-mono text-xs lg:inline-flex"
              title={`${translations("Template ID")}: ${editingItem.data.id} — click to copy`}
              onClick={() => {
                void navigator.clipboard.writeText(editingItem.data.id);
                toast.success("Template ID copied");
              }}
            >
              ID {editingItem.data.id}
              <IconCopy className="size-3.5" aria-hidden />
            </Button>
          )}
          {editingItem?.data?.id && values.status !== "DRAFT" && (
            <Button
              size="sm"
              variant="outline"
              render={
                <Link
                  to="/dashboard/whatsapp/templates/$templateId/analytics"
                  params={{ templateId: editingItem.id }}
                />
              }
            >
              <IconChartBar className="size-4" aria-hidden />
              {translations("Analytics")}
            </Button>
          )}
          {isReadOnly && (
            <Button type="button" size="sm" variant="outline" onClick={() => toggle()}>
              <IconPencil className="size-4" aria-hidden />
              {translations("Edit")}
            </Button>
          )}
          <PhonePreviewButton platform="whatsapp" label={translations("Preview")} defaultOpen>
            <WhatsAppChatShell>{messageContent}</WhatsAppChatShell>
          </PhonePreviewButton>
        </div>
      </header>

      <form
        onSubmit={(event) => {
          // Enter in a text field moves on; it never submits a half-built template.
          event.preventDefault();
          if (!isLastStep) void goNext();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-border bg-card flex h-15 shrink-0 items-center border-b px-8">
          <Stepper
            steps={steps.map((id, index) => ({
              id,
              label: STEP_LABEL[id],
              complete: isEdit || index < furthest,
              enabled: index <= furthest,
            }))}
            currentStep={step}
            onStepChange={(id) => {
              const target = steps.find((candidate) => candidate === id);
              if (target) goTo(target);
            }}
          />
        </div>

        {/* min-h-0 is what lets this scroll instead of pushing the footer off. */}
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto flex w-full flex-col gap-8 px-8 pt-9 pb-8 lg:px-12",
              step === "start" ? "max-w-240" : "max-w-160",
            )}
          >
            <header className="flex flex-col gap-1.5">
              <h1 className={PAGE_TITLE}>{heading.title}</h1>
              <p className="text-muted-foreground text-sm text-pretty">{heading.description}</p>
            </header>
            {isReadOnly && step !== "review" && (
              <Alert>
                <IconLock />
                <AlertDescription>
                  You're viewing the submitted template. Click Edit to change it — an edited
                  template goes back to Meta for review.
                </AlertDescription>
              </Alert>
            )}

            {step === "start" && (
              <StartStep
                source={startSource}
                onSourceChange={setStartSource}
                showStarters={!forceTemplateType}
                channelId={values.whatsappSettingsPhoneId ?? ""}
                onChannelChange={(id) => {
                  setTemplateValue("whatsappSettingsPhoneId", id);
                  setTemplateValue("defaultValues.whatsappSettingsPhoneId", id);
                }}
                language={libraryLanguage(values.language)}
                picked={start}
                onPick={pickStart}
              />
            )}
            {step === "setup" && setupStep}
            {step === "content" && contentStep}
            {step === "buttons" && buttonsStep}
            {step === "details" && libraryEntry && (
              <LibraryDetailsStep
                entry={libraryEntry}
                inputs={libraryInputs}
                onInputsChange={(next) => {
                  setLibraryInputs(next);
                  // Kept in the form too, so the preview and a draft carry the links.
                  const filled = libraryToFormValues(libraryEntry, next);
                  setTemplateValue("buttons", filled.buttons);
                  setTemplateValue("body", filled.body);
                }}
                onCustomize={customizeLibraryEntry}
              />
            )}
            {step === "review" && reviewStep}
          </div>
        </div>

        <footer className="border-border bg-card flex h-17 shrink-0 items-center gap-3 border-t px-8">
          {stepIndex === 0 ? (
            <Button type="button" variant="ghost" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={goBack}>
              <IconArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {blocker && (
              <span role="status" className="text-destructive text-right text-[13px]">
                {blocker}
              </span>
            )}
            {canDraft && (
              <Button
                key="draft"
                type="button"
                variant="outline"
                loading={isSubmittingDraft}
                onClick={() => void handleSubmit(true)}
              >
                <IconDeviceFloppy className="size-4" aria-hidden />
                {translations("Save as draft")}
              </Button>
            )}
            {!isLastStep && (
              <Button
                key="next"
                type="button"
                variant={canSave ? "outline" : "default"}
                disabled={Boolean(blocker)}
                onClick={() => void goNext()}
              >
                Continue
                <IconArrowRight className="size-4" aria-hidden />
              </Button>
            )}
            {canSave && libraryEntry && (
              <Button
                key="library"
                type="button"
                className="min-w-44"
                loading={createFromLibrary.isPending}
                disabled={Boolean(blocker)}
                onClick={() => void submitLibrary()}
              >
                <IconSend className="size-4" aria-hidden />
                Create template
              </Button>
            )}
            {canSave && !libraryEntry && (
              <>
                <Button
                  key="submit"
                  type="button"
                  loading={isSubmitting}
                  onClick={() => void handleSubmit(false)}
                >
                  {isEdit ? (
                    <IconDeviceFloppy className="size-4" aria-hidden />
                  ) : (
                    <IconSend className="size-4" aria-hidden />
                  )}
                  {isEdit ? "Save & resubmit" : "Submit to Meta"}
                </Button>
              </>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}

const SETUP_FIELDS = new Set([
  "name",
  "templateType",
  "category",
  "language",
  "whatsappSettingsPhoneId",
]);

/** The step that owns the first field with an error, so a failed save shows it. */
function stepForError(errors: object): TemplateStep {
  const field = Object.keys(errors).find((key) => key !== "ref");
  if (!field) return "content";
  if (SETUP_FIELDS.has(field)) return "setup";
  if (field === "buttons") return "buttons";
  return "content";
}

function isArrayInCorrectOrder(arr: string[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== (i + 1).toString()) {
      return false;
    }
  }
  return true;
}
