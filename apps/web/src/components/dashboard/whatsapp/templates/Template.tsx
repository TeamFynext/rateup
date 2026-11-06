// Extracted verbatim from the `/dashboard/whatsapp/templates/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconChartBar, IconDots, IconPlus, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { useDeleteWaTemplateMutation, useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import WaPageTourSteps from "@/components/WelcomeTour/components/WaPageTourSteps.ts";
import WelcomeTour from "@/components/WelcomeTour/WelcomeTour.tsx";
import { EnableTemplateAnalytics } from "@/components/whatsapp/templates/analytics/EnableTemplateAnalytics.tsx";
import { useNumbersWithoutAnalytics } from "@/components/whatsapp/templates/analytics/useNumbersWithoutAnalytics.ts";
import { TemplateFilterSort } from "@/components/whatsapp/templates/FilterAndSort.tsx";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { TemplateType, WhatsappSettingsStatus } from "@/types/enums.ts";
import { docsPath } from "@/utils/constants.ts";

import styles from "@/components/WelcomeTour/components/Tour.module.css";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

type TemplateListEntry = WaTemplateListEntry;

const BRAND_CHIP = { color: "text-primary", bg: "bg-primary/10 border-primary/20" };

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  MARKETING: { label: "Marketing", ...BRAND_CHIP },
  UTILITY: { label: "Utility", ...BRAND_CHIP },
  AUTHENTICATION: { label: "Authentication", ...BRAND_CHIP },
  Blank: { label: "Blank", color: "text-muted-foreground", bg: "bg-muted border-border" },
};

const BRAND_CHIP_CLASS = `text-[11px] font-medium px-2 py-0.5 rounded-md border ${BRAND_CHIP.bg} ${BRAND_CHIP.color}`;

const CHIP_CLASS =
  "text-[11px] font-medium px-2 py-0.5 rounded-md border border-border bg-muted text-muted-foreground";

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
    className: "text-destructive bg-destructive/10 ",
  },
  DRAFT: {
    label: "Draft",
    className: "text-muted-foreground bg-muted",
  },
};

export function Template() {
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

    return sortData(filtered, sortOption);
  }, [templates, filters, sortOption, debouncedSearch, selectedAccountId]);

  const templateDeleteMutation = useDeleteWaTemplateMutation();
  const numbersWithoutAnalytics = useNumbersWithoutAnalytics(filteredTemplates);

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
    navigate({
      to: "/dashboard/whatsapp/templates/$templateId",
      params: { templateId: "create" },
    });
  }
  function handleAnalyticsClick(template: { id: string }) {
    navigate({
      to: "/dashboard/whatsapp/templates/$templateId/analytics",
      params: { templateId: template.id },
    });
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
        <div className="flex flex-col gap-4">
          {numbersWithoutAnalytics.map((phoneId) => (
            <EnableTemplateAnalytics
              key={phoneId}
              phoneId={phoneId}
              accountName={data?.find((account) => account.phoneId === phoneId)?.phoneDisplayName}
            />
          ))}
          <CardGrid
            items={filteredTemplates ?? []}
            getKey={(template) => template.id}
            renderItem={(template) => (
              <TemplateCard
                template={template}
                onClick={() => handleEditClick(template)}
                onAnalytics={() => handleAnalyticsClick(template)}
                onDelete={() => handleDeleteTemplate(template.id)}
              />
            )}
          />
        </div>
      </ListPageContent>
    </ListPage>
  );
}

interface TemplateCardProps {
  readonly template: TemplateListEntry;
  readonly onClick: () => void;
  readonly onAnalytics: () => void;
  readonly onDelete: () => void;
}

function TemplateCard({ template, onClick, onAnalytics, onDelete }: Readonly<TemplateCardProps>) {
  const { t: translations } = useTranslation();
  const hasActiveCampaign = (template?._count?.Campaign ?? 0) > 0;

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={translations("More actions")}
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

  const content = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap min-h-10">
        <span className={BRAND_CHIP_CLASS} title={template?.whatsappSettingsPhoneId ?? undefined}>
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
          <span className={BRAND_CHIP_CLASS} title={template.templateType}>
            {formatLabel(template.templateType)}
          </span>
        )}
      </div>
    </div>
  );

  const statusBadge = (
    <span
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusMeta.className}`}
    >
      {statusMeta.label}
    </span>
  );
  // On the card itself, not only in the ⋯ menu, so it can be found.
  const canViewAnalytics = !!template?.data?.id && template.data.status !== "DRAFT";
  const footerLeft = (
    <div className="flex items-center gap-2">
      {statusBadge}
      {canViewAnalytics && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onAnalytics();
          }}
        >
          <IconChartBar size={14} />
          {translations("Analytics")}
        </Button>
      )}
    </div>
  );

  return (
    <ActionCard
      title={template?.data?.name}
      subtitle={template?.data?.category || "Template"}
      actions={menu}
      content={content}
      footerLeft={footerLeft}
      createdAt={template.createdAt}
      onClick={onClick}
    />
  );
}
