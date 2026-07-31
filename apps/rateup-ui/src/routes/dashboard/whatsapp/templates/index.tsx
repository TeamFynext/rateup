import { IconDots, IconPlus, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import type { WaTemplateDraftPayload } from "@/backend/whatsapp/whatsapp.api";
import {
  useDeleteWaTemplateMutation,
  useSaveTemplateAsDraftMutation,
  useWaTemplates,
} from "@/backend/whatsapp/whatsapp.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import WaPageTourSteps from "@/components/WelcomeTour/components/WaPageTourSteps.ts";
import WelcomeTour from "@/components/WelcomeTour/WelcomeTour.tsx";
import { TemplateFilterSort } from "@/components/whatsapp/templates/FilterAndSort.tsx";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { TemplateType, WhatsappSettingsStatus } from "@/types/enums.ts";
import { docsPath } from "@/utils/constants.ts";

import styles from "@/components/WelcomeTour/components/Tour.module.css";

export const Route = createFileRoute("/dashboard/whatsapp/templates/")({
  component: Template,
});

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

interface TemplateListEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly templateType?: string;
  readonly whatsappSettingsPhoneId?: string | null;
  readonly WhatsappSettings?: {
    readonly phoneDisplayName?: string | null;
  };
  readonly _count?: {
    readonly Campaign?: number;
  };
  readonly data?: {
    readonly name?: string;
    readonly category?: string;
    readonly status?: string;
  };
}

/** A starter template offered in the "create from predefined" flow. */
interface PredefinedTemplate {
  type: string;
  name: string;
  description: string;
  category: string;
  body?: string;
  templateType?: TemplateType;
  format?: string;
  header?: string | null;
  footer?: string;
  buttons?: unknown[];
  example?: string[];
  isBlank?: boolean;
}

const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    type: "Blank",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "Blank Template",
    body: "Create a custom template from scratch.",
    description: "Start with a clean slate and build your own WhatsApp template.",
    isBlank: true,
    category: "MARKETING",
  },
  {
    type: "Payment Confirmed",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_payment_confirmed",
    body: "Payment Confirmed for Order #{{1}}\n\nHello {{2}},\n\nGreat news! We've received your payment for Order #{{3}}.\n\nPayment Details\n\nOrder Number: {{4}}\nAmount Paid: {{5}}\nPayment Method: {{6}}\nPayment Date: {{7}}\n\nYour order is now being prepared for fulfilment.\n\nThank you,\nSupport Team",
    description: "Confirm order payment receipt with transactional details",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "₹999.00", "UPI", "2026-06-18"],
  },
  {
    type: "Order Created (Promo)",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_received_promo",
    body: "Your Order #{{1}} Has Been Received 🎉\n\nHello {{2}},\n\nThank you for shopping with us!\n\nWe've successfully received your order #{{3}}\n\nOrder Summary\n\nOrder Number: {{4}}\nTotal Amount: {{5}}\nPayment Status: {{6}}\n\nWe'll notify you once your order is processed and ready for shipment.\n\nThank you,\nSupport Team",
    description: "Confirm order receipt and details (Marketing category)",
    category: "MARKETING",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "₹1,999.00", "Paid"],
  },
  {
    type: "Order Cancelled",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_cancelled",
    body: "Order #{{1}} Has Been Cancelled\n\nHello {{2}},\n\nYour order #{{3}} has been cancelled.\n\nCancellation Details\n\nOrder Number: {{4}}\nCancellation Date: {{5}}\nReason: {{6}}\n\nIf payment has already been received, any applicable refund will be processed according to our refund policy.\n\nThank you,\nSupport Team",
    description: "Notify transaction cancellation and refund terms for order",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "2026-06-18", "Out of stock"],
  },
  {
    type: "Draft Order Created",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "draft_order_created",
    body: "Your Draft Order Is Ready\n\nHello {{1}},\n\nWe've created a draft order for you.\n\nDraft Order Details\n\nDraft Order Number: {{2}}\nTotal Amount: {{3}}\n\nComplete your purchase using the link below:\n\n{{4}}\n\nThank you,\nSupport Team",
    description: "Provide invoice and link to complete draft order purchase",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["Customer", "DFT-10023", "₹1,499.00", "https://www.example.com/checkout"],
  },
  {
    type: "Order Confirmation",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_received_utility",
    body: "Your Order #{{1}} Has Been Received 🎉\n\nHello {{2}},\n\nThank you for shopping with us!\n\nWe've successfully received your order #{{3}} placed on {{4}}.\n\nOrder Summary\n\nOrder Number: {{5}}\nTotal Amount: {{6}}\nPayment Status: {{7}}\n\nWe'll notify you once your order is processed and ready for shipment.\n\nThank you,\nSupport Team",
    description: "Confirm order receipt and details (Utility category)",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "2026-06-18", "10023", "₹1,999.00", "Pending"],
  },
  {
    type: "Abandoned Cart",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "abandoned_checkout",
    body: "You Left Something Behind 🛒\n\nHello {{1}},\n\nLooks like you left some items in your cart.\n\nCheckout Details\n\nCheckout Number: {{2}}\nCart Value: {{3}}\n\nComplete your purchase before your items go out of stock.\n\nResume Checkout:\n{{4}}\n\nNeed assistance? We're happy to help.\n\nThank you,\nSupport Team",
    description: "Send cart check out reminder link to complete checkout",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["Customer", "CHK-92834", "₹2,500.00", "https://www.example.com/checkout"],
  },
  {
    type: "Order Partially Fulfilled",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_partially_shipped",
    body: "Part of Your Order #{{1}} Has Been Shipped\n\nHello {{2}},\n\nA portion of your order #{{3}} has been fulfilled and shipped.\n\nItems Shipped\n{{4}}\n\nPending Items\n{{5}}\n\nWe'll notify you once the remaining items are shipped.\n\nThank you,\nSupport Team",
    description: "Notify shipment updates for partial order fulfillments",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "1x Face Cream", "1x Sunscreen"],
  },
  {
    type: "Order Shipped",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_shipped",
    body: "Your Order #{{1}} Has Been Shipped 🚚\n\nHello {{2}},\n\nYour order #{{3}} has been fulfilled and shipped.\n\nShipping Details\n\nTracking Number: {{4}}\nCourier: {{5}}\nTracking URL: {{6}}\n\nYou can track your shipment using the details above.\n\nThank you,\nSupport Team",
    description: "Notify shipment fulfillment with courier and tracking url",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "TRK928374", "FedEx", "https://www.example.com/track"],
  },
  {
    type: "Order Returned/Cancelled",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_returned_or_cancelled",
    body: "Fulfilled Order #{{1}} Has Been Cancelled\n\nHello {{2}},\n\nYour previously fulfilled order #{{3}} has been cancelled.\n\nDetails\n\nOrder Number: {{4}}\nCancellation Date: {{5}}\nReason: {{6}}\n\nIf applicable, refund details will be communicated separately.\n\nThank you,\nSupport Team",
    description: "Acknowledge return or cancellation of already fulfilled order",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "2026-06-18", "Customer request"],
  },
];

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  MARKETING: { label: "Marketing", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  UTILITY: { label: "Utility", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  AUTHENTICATION: {
    label: "Authentication",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
  },
  Blank: { label: "Blank", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

const TEMPLATE_TYPE_META: Record<string, { color: string; bg: string }> = {
  [TemplateType.GENERAL_NOTIFICATION]: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  [TemplateType.ORDER_DETAILS]: { color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  [TemplateType.PAYMENT_CONFIRMATION]: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  [TemplateType.LOYALTY]: { color: "text-fuchsia-700", bg: "bg-fuchsia-50 border-fuchsia-200" },
  [TemplateType.CAROUSEL]: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
};

const ACCOUNT_CHIP_CLASS =
  "text-[11px] font-medium px-2 py-0.5 rounded-md border bg-pink-50 border-pink-200 text-pink-700";

const CHIP_CLASS =
  "text-[11px] font-medium px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";

const STATUS_BADGE_META: Record<string, { label: string; className: string }> = {
  APPROVED: {
    label: "Approved",
    className: "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  PENDING: {
    label: "Pending",
    className: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  REJECTED: {
    label: "Rejected",
    className: "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  DRAFT: {
    label: "Draft",
    className: "text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

interface TemplatePickerProps {
  readonly templates: typeof PREDEFINED_TEMPLATES;
  readonly translations: (key: string) => string;
  readonly onSelect: (tpl: (typeof PREDEFINED_TEMPLATES)[number]) => void;
}

function TemplatePicker({ templates, translations, onSelect }: Readonly<TemplatePickerProps>) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => (t.isBlank ? "Blank" : t.category)));
    return ["all", ...Array.from(cats)];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return templates.filter((t) => {
      const cat = t.isBlank ? "Blank" : t.category;
      const matchCat = activeCategory === "all" || cat === activeCategory;
      const matchQ =
        !q ||
        t.type.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.body?.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [templates, search, activeCategory]);

  const blank = filtered.find((t) => t.isBlank);
  const rest = filtered.filter((t) => !t.isBlank);

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="relative flex-1 min-w-[180px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isAll = cat === "all";
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                  active
                    ? isAll
                      ? "bg-foreground text-background border-foreground"
                      : `${meta?.bg ?? "bg-muted"} ${meta?.color ?? "text-foreground"} border-current shadow-sm`
                    : "bg-muted text-muted-foreground border-transparent hover:border-border"
                }`}
              >
                {isAll ? "All" : (meta?.label ?? cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Blank card – full-width row */}
      {blank && (
        <button
          onClick={() => onSelect(blank)}
          className="group w-full flex items-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/40 px-5 py-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-background text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              {translations("Blank Template")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {translations(blank.description)}
            </div>
          </div>
          <svg
            className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Template grid */}
      {rest.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No templates match your search.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((tpl) => {
          const cat = tpl.isBlank ? "Blank" : (tpl.category ?? "UTILITY");
          const meta = CATEGORY_META[cat] ?? CATEGORY_META["UTILITY"];
          return (
            <button
              key={tpl.name}
              onClick={() => onSelect(tpl)}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm leading-snug text-card-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1">
                  {tpl.type}
                </p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.bg} ${meta.color}`}
                >
                  {meta.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {translations(tpl.description)}
              </p>

              {/* Body preview */}
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap font-mono border border-border/50">
                {tpl.body}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-1">
                {tpl.buttons && tpl.buttons.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {tpl.buttons.map((btn, i: number) => (
                      <span
                        key={i}
                        className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary border border-primary/15"
                      >
                        {btn.text}
                      </span>
                    ))}
                  </div>
                )}
                {(!tpl.buttons || tpl.buttons.length === 0) && <span />}
                <span className="ml-auto text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                  {tpl.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Template() {
  const { data: templates, isPending, isError, refetch } = useWaTemplates();
  const navigate = useNavigate();
  const [sortOption, setSortOption] = useState("latest");
  const { data } = useWaSettings();
  const confirm = useConfirm();
  const { t: translations } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 200);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    templateType: "all",
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedPredefined, setSelectedPredefined] = useState<any>(null);
  const [step, setStep] = useState<"pick" | "account" | "loading">("pick");
  const [createDraftAccountId, setCreateDraftAccountId] = useState("");

  const saveDraftMutation = useSaveTemplateAsDraftMutation(
    "",
    async (data) => {
      console.log("saveDraftMutation onSuccess data:", data);
      toast.success(translations("Draft created"));

      const refetchResult = await refetch();
      const updatedTemplates = [...(refetchResult.data || [])];

      updatedTemplates.sort((a: unknown, b: unknown) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const newestTemplate = updatedTemplates[0];

      setShowModal(false);
      setSelectedPredefined(null);
      setCreateDraftAccountId("");
      setStep("pick");

      if (newestTemplate?.id) {
        navigate({
          to: `/dashboard/whatsapp/templates/${newestTemplate.id}`,
        });
      }
    },
    () => {
      setStep("account");
    },
  );

  function handleConfirmCreateDraft() {
    if (!selectedPredefined || !createDraftAccountId) {
      toast.error(translations("Please select a WhatsApp account."));
      return;
    }
    setStep("loading");
    const payload: WaTemplateDraftPayload = {
      name: selectedPredefined.name,
      header: selectedPredefined.header || null,
      language: "en",
      body: selectedPredefined.body,
      footer: selectedPredefined.footer || "Powered by rateup.app",
      category: selectedPredefined.category,
      format: selectedPredefined.format || "NONE",
      buttons: selectedPredefined.buttons || [],
      status: "DRAFT",
      example: selectedPredefined.example || [],
      templateType: selectedPredefined.templateType || TemplateType.GENERAL_NOTIFICATION,
      mediaCarousel: [],
      productCarousel: [],
      whatsappSettingsPhoneId: createDraftAccountId,
      defaultValues: {
        catalog: {
          thumbnail_product_retailer_id: "",
          mpm: { sections: [] },
          spm: { product_retailer_id: "" },
          catalogId: "",
        },
        whatsappSettingsPhoneId: createDraftAccountId,
      },
    };
    saveDraftMutation.mutate(payload);
  }

  const templateTypeOptions = [
    { value: "all", label: "All Types" },
    ...Object.values(TemplateType).map((type) => ({
      value: type,
      label: formatLabel(type),
    })),
  ];
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const searchValue = debouncedSearch?.toLowerCase() || "";
    const filtered = templates.filter((template) => {
      const templateWithAccount = template as {
        whatsappSettingsPhoneId?: string;
        defaultValues?: { whatsappSettingsPhoneId?: string };
      };
      const status = template?.data?.status;
      const category = template?.data?.category;
      const type = template?.templateType;
      const name = template?.data?.name?.toLowerCase() || "";
      const templateAccountId =
        templateWithAccount.whatsappSettingsPhoneId ||
        templateWithAccount.defaultValues?.whatsappSettingsPhoneId ||
        "";
      const matchSearch = !searchValue || name.includes(searchValue);
      const matchStatus = filters.status === "all" || status === filters.status;
      const matchCategory = filters.category === "all" || category === filters.category;
      const matchAccount =
        selectedAccountId === "all" ||
        !selectedAccountId ||
        templateAccountId === selectedAccountId;

      const matchTemplateType = filters.templateType === "all" || type === filters.templateType;

      return matchSearch && matchStatus && matchCategory && matchTemplateType && matchAccount;
    });

    return sortData(filtered, sortOption) as TemplateListEntry[];
  }, [templates, filters, sortOption, debouncedSearch, selectedAccountId]);

  const templateDeleteMutation = useDeleteWaTemplateMutation();

  async function handleDeleteTemplate(templateId: string) {
    const shouldDelete = await confirm({
      title: translations("Delete Template"),
      description: translations("Are you sure you want to delete this Template?"),
      confirmText: translations("Delete"),
      cancelText: translations("cancel"),
    });

    if (!shouldDelete) return;

    toast.loading(translations("Hold on, Template is getting Deleted..."), {
      id: "template-delete",
    });
    templateDeleteMutation.mutate(templateId);
  }

  function handleCreateClick() {
    setShowModal(true);
    setStep("pick");
    setSelectedPredefined(null);
    setCreateDraftAccountId("");
  }
  function handleEditClick(template: { id: string }) {
    navigate({
      to: `/dashboard/whatsapp/templates/${template.id}`,
    });
  }

  const syncAccountIds = useMemo(() => {
    const activeAccountIds =
      data
        ?.filter((account) => account.status !== WhatsappSettingsStatus.DISCONNECTED)
        .map((account) => account.phoneId) ?? [];

    if (selectedAccountId === "all") {
      return activeAccountIds;
    }

    return selectedAccountId ? [selectedAccountId] : activeAccountIds;
  }, [data, selectedAccountId]);

  const tourSteps = WaPageTourSteps({ styles });

  const createButton = (
    <Button onClick={handleCreateClick} disabled={!data || isPending}>
      {translations("Create Templates")}
      <IconPlus size={16} className="ml-2" />
    </Button>
  );

  const rightControls = (
    <>
      <TemplateFilterSort
        filters={filters}
        setFilters={setFilters}
        templateTypeOptions={templateTypeOptions}
      />
      <AccountSelector
        value={selectedAccountId}
        onChange={(value) => setSelectedAccountId(value ?? "")}
        withAllOption
      />
      <ListPageSortDropdown value={sortOption} onChange={setSortOption} />

      {data ? (
        <SyncTemplatesButton disabled={isPending} whatsappSettingsPhoneIds={syncAccountIds} />
      ) : (
        <Tooltip>
          <TooltipTrigger render={<div />}>
            <SyncTemplatesButton disabled />
          </TooltipTrigger>
          <TooltipContent>
            <p>{translations("Connect a WhatsApp number in settings to sync Template")}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <ListPage>
      <ListPageHeader>
        <ListPageHeaderSection className="gap-3">
          {data ? (
            createButton
          ) : (
            <Tooltip>
              <TooltipTrigger render={<div />}>{createButton}</TooltipTrigger>
              <TooltipContent>
                <p>{translations("Connect a WhatsApp number in settings to create a Template")}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <InfoButton docUrl={`${docsPath}/whatsapp/templates`} />
          {tourSteps && <WelcomeTour steps={tourSteps} />}
          <RefreshButton queryKeys={["watemplates"]} />
        </ListPageHeaderSection>

        <ListPageHeaderSection>
          <ListPageSearchInput
            placeholder="Search templates..."
            value={search}
            onChange={setSearch}
          />
          {rightControls}
        </ListPageHeaderSection>
      </ListPageHeader>
      <ListPageContent
        isLoading={isPending}
        isError={isError}
        isEmpty={!isPending && !isError && filteredTemplates.length === 0}
        emptyTitle={translations("No templates found")}
        emptyDescription={translations("Try changing filters or create a new template.")}
        onRetry={refetch}
      >
        <CardGrid
          items={filteredTemplates ?? []}
          getKey={(template) => template.id}
          renderItem={(template) => (
            <TemplateCard
              template={template}
              onClick={() => handleEditClick(template)}
              onDelete={() => handleDeleteTemplate(template.id)}
            />
          )}
        />
      </ListPageContent>
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            setSelectedPredefined(null);
            setStep("pick");
          }
        }}
        modal
      >
        <DialogContent
          showCloseButton
          className={step === "pick" ? "min-w-[90vw] max-w-7xl" : "max-w-md"}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {step === "pick"
                ? translations("Pick a Template")
                : translations("Create Draft from Predefined Template")}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                if (step === "pick") return translations("Select a template to start.");
                if (step === "account" && selectedPredefined)
                  return `${translations("Are you sure you want to create a draft from")} ${selectedPredefined.name}? ${translations("Please select a WhatsApp account to associate with this template.")}`;
                return "";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 no-scrollbar max-h-[80vh] overflow-y-auto px-4">
            {step === "pick" ? (
              <TemplatePicker
                templates={PREDEFINED_TEMPLATES}
                translations={translations}
                onSelect={(tpl) => {
                  if (tpl.isBlank) {
                    setShowModal(false);
                    navigate({
                      to: "/dashboard/whatsapp/templates/$templateId",
                      params: { templateId: "create" },
                    });
                  } else {
                    setSelectedPredefined(tpl);
                    setStep("account");
                  }
                }}
              />
            ) : (
              <div className="flex flex-col gap-4 py-4">
                <AccountSelector
                  value={createDraftAccountId}
                  onChange={(value) => setCreateDraftAccountId(value ?? "")}
                  label={translations("WhatsApp Account")}
                  withAllOption={false}
                  optional={false}
                />
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedPredefined(null);
                      setCreateDraftAccountId("");
                      setStep("pick");
                    }}
                  >
                    {translations("Back")}
                  </Button>
                  <Button
                    type="button"
                    disabled={step === "loading"}
                    onClick={handleConfirmCreateDraft}
                  >
                    {step === "loading"
                      ? translations("Creating...")
                      : translations("Create Draft")}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ListPage>
  );
}

interface TemplateCardProps {
  readonly template: TemplateListEntry;
  readonly onClick: () => void;
  readonly onDelete: () => void;
}

function TemplateCard({ template, onClick, onDelete }: Readonly<TemplateCardProps>) {
  const hasActiveCampaign = (template?._count?.Campaign ?? 0) > 0;

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <IconDots size={20} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger render={<div />}>
            <DropdownMenuItem
              onClick={() => {
                if (hasActiveCampaign) return;
                onDelete();
              }}
              disabled={hasActiveCampaign}
              variant="destructive"
            >
              <IconTrash size={16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {hasActiveCampaign
                ? "Cannot delete template with active campaigns"
                : "Delete template"}
            </p>
          </TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const category = template?.data?.category;
  const categoryMeta = category ? CATEGORY_META[category] : undefined;
  const status = template?.data?.status ?? "DRAFT";
  const statusMeta = STATUS_BADGE_META[status] ?? STATUS_BADGE_META.DRAFT;
  const accountName =
    template?.WhatsappSettings?.phoneDisplayName || template?.whatsappSettingsPhoneId;
  const templateTypeMeta = template?.templateType
    ? TEMPLATE_TYPE_META[template.templateType]
    : undefined;

  const content = (
    <div className="flex items-center gap-2 flex-wrap min-h-10">
      <span className={ACCOUNT_CHIP_CLASS} title={template?.whatsappSettingsPhoneId ?? undefined}>
        {accountName ?? "No Account"}
      </span>
      {category && (
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${categoryMeta ? `${categoryMeta.bg} ${categoryMeta.color}` : CHIP_CLASS}`}
        >
          {categoryMeta?.label ?? category}
        </span>
      )}
      {template?.templateType && (
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${templateTypeMeta ? `${templateTypeMeta.bg} ${templateTypeMeta.color}` : CHIP_CLASS}`}
          title={template.templateType}
        >
          {formatLabel(template.templateType)}
        </span>
      )}
    </div>
  );

  const statusBadge = (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusMeta.className}`}
    >
      {statusMeta.label}
    </span>
  );

  return (
    <ActionCard
      title={template?.data?.name}
      subtitle={template?.data?.category || "Template"}
      actions={menu}
      content={content}
      footerLeft={statusBadge}
      createdAt={template.createdAt}
      onClick={onClick}
    />
  );
}
