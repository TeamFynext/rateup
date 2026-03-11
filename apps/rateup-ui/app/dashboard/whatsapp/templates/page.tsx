"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { IconDots, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { TemplateType, WhatsappSettingsStatus } from "@/types/enums";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import {
  useDeleteWaTemplateMutation,
  useWaTemplates,
} from "@/backend/whatsapp/whatsapp.query";
import {
  GenericActionCard,
  GenericCardGrid,
} from "@/components/common/generic-card";
import { ListPageLayout } from "@/components/common/list-page-layout";
import { sortData } from "@/components/Dashboard/SortDropDown";
import { AccountSelector } from "@/components/input/AccountSelector";
import useDebounce from "@/components/menu/hook/useDebounce";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import styles from "@/components/WelcomeTour/components/Tour.module.css";
import WaPageTourSteps from "@/components/WelcomeTour/components/WaPageTourSteps";
import { TemplateFilterSort } from "@/components/whatsapp/templates/FilterAndSort";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) =>
      word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word,
    )
    .join(" ");
}

type TemplateListEntry = {
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
};

export default function Template() {
  const { data: templates, isPending, isError, refetch } = useWaTemplates();
  const [sortOption, setSortOption] = useState("latest");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);
  const { data } = useWaSettings();
  const translations = useTranslations();
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
      const matchCategory =
        filters.category === "all" || category === filters.category;
      const matchAccount =
        selectedAccountId === "all" ||
        !selectedAccountId ||
        templateAccountId === selectedAccountId;

      const matchTemplateType =
        filters.templateType === "all" || type === filters.templateType;

      return (
        matchSearch &&
        matchStatus &&
        matchCategory &&
        matchTemplateType &&
        matchAccount
      );
    });

    return sortData(filtered, sortOption) as TemplateListEntry[];
  }, [templates, filters, sortOption, debouncedSearch, selectedAccountId]);

  const templateDeleteMutation = useDeleteWaTemplateMutation(
    () => {
      setSelectedTemplate(null);
    },
    () => {
      setSelectedTemplate(null);
    },
  );

  const router = useRouter();
  function handleCreateClick() {
    router.push(`/dashboard/whatsapp/templates/create`);
  }
  function handleEditClick(template) {
    router.push(`/dashboard/whatsapp/templates/${template.id}`);
  }

  const syncAccountIds = useMemo(() => {
    const activeAccountIds =
      data
        ?.filter(
          (account) => account.status !== WhatsappSettingsStatus.DISCONNECTED,
        )
        .map((account) => account.phoneId) ?? [];

    if (selectedAccountId === "all") {
      return activeAccountIds;
    }

    return selectedAccountId ? [selectedAccountId] : activeAccountIds;
  }, [data, selectedAccountId]);

  const tourSteps = WaPageTourSteps({ styles });

  const rightControls = (
    <>
      <TemplateFilterSort
        filters={filters}
        setFilters={setFilters}
        templateTypeOptions={templateTypeOptions}
      />
      <AccountSelector
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        withAllOption
      />

      {data ? (
        <SyncTemplatesButton
          disabled={isPending}
          whatsappSettingsPhoneIds={syncAccountIds}
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <SyncTemplatesButton disabled />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {translations(
                "Connect a WhatsApp number in settings to sync Template",
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <ListPageLayout
      canCreate={Boolean(data)}
      createLabel={translations("Create Templates")}
      createDisabledText={translations(
        "Connect a WhatsApp number in settings to create a Template",
      )}
      docsUrl={"whatsapp/templates"}
      isLoading={isPending}
      queryKeys={["watemplates"]}
      search={search}
      searchPlaceholder="Search templates..."
      tourSteps={tourSteps}
      onCreate={handleCreateClick}
      onSearchChange={setSearch}
      sortValue={sortOption}
      onSortChange={setSortOption}
      isError={isError}
      onRetry={refetch}
      isEmpty={!isPending && !isError && filteredTemplates.length === 0}
      emptyTitle={translations("No templates found")}
      emptyDescription={translations(
        "Try changing filters or create a new template.",
      )}
      rightControls={rightControls}
    >
      <TemplateCardList
        handleEditClick={handleEditClick}
        setSelectedTemplate={setSelectedTemplate}
        sortedTemplates={filteredTemplates}
        toggle={() => setDeleteDialogOpened((prev) => !prev)}
      />
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={() => setDeleteDialogOpened(false)}
        headerLabel={translations(
          "Are you sure you want to delete this Template?",
        )}
        headerTitle={translations("Delete Template")}
        confirmLabel={translations("Delete")}
        onConfirm={() => {
          if (selectedTemplate) {
            toast.loading(
              translations("Hold on, Template is getting Deleted"),
              {
                id: "template-delete",
              },
            );
            templateDeleteMutation.mutate(selectedTemplate);
          }
        }}
      />
    </ListPageLayout>
  );
}

type TemplateCardListProps = {
  readonly sortedTemplates: TemplateListEntry[];
  readonly toggle: () => void;
  readonly handleEditClick: (template: TemplateListEntry) => void;
  readonly setSelectedTemplate: (value: string) => void;
};

const TemplateCardList = ({
  sortedTemplates,
  toggle,
  handleEditClick,
  setSelectedTemplate,
}: Readonly<TemplateCardListProps>) => {
  return (
    <GenericCardGrid
      items={sortedTemplates ?? []}
      getKey={(template) => template.id}
      renderItem={(template) => (
        <TemplateCard
          template={template}
          onClick={() => handleEditClick(template)}
          toggle={toggle}
          setSelectedTemplate={setSelectedTemplate}
        />
      )}
    />
  );
};
type TemplateCardProps = {
  readonly template: TemplateListEntry;
  readonly onClick: () => void;
  readonly toggle: () => void;
  readonly setSelectedTemplate: (value: string) => void;
};

function TemplateCard({
  template,
  onClick,
  toggle,
  setSelectedTemplate,
}: Readonly<TemplateCardProps>) {
  const hasActiveCampaign = (template?._count?.Campaign ?? 0) > 0;

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <IconDots size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DropdownMenuItem
                onClick={() => {
                  if (hasActiveCampaign) return;
                  setSelectedTemplate(template.id);
                  toggle();
                }}
                disabled={hasActiveCampaign}
                variant="destructive"
              >
                <IconTrash size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </div>
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
  const content = (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" className="text-xs">
        {(template?.WhatsappSettings?.phoneDisplayName ||
          template?.whatsappSettingsPhoneId) ??
          "No Account"}
      </Badge>
      <WaTemplateStatusBadge
        status={template?.data?.category as never}
        defaultType
      />
      <WaTemplateStatusBadge
        status={template?.templateType as never}
        defaultType
      />
    </div>
  );

  return (
    <GenericActionCard
      title={template?.data?.name}
      titleTooltip={template?.data?.name}
      subtitle={template?.data?.category || "Template"}
      actions={menu}
      content={content}
      footerLeft={
        <WaTemplateStatusBadge status={template?.data?.status as never} />
      }
      createdAt={template.createdAt}
      onClick={onClick}
    />
  );
}
