"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconCalendar,
  IconDots,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { TemplateType, WhatsappSettingsStatus } from "@/types/enums";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import {
  useDeleteWaTemplateMutation,
  useWaTemplates,
} from "@/backend/whatsapp/whatsapp.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { TemplatesCardListSkeleton } from "@/components/animation/skeleton/wa/TemplatesCardList.skeleton";
import InfoButton from "@/components/Button/InfoButton";
import RefreshButton from "@/components/Button/RefreshButton";
import { sortData } from "@/components/Dashboard/SortDropDown";
import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import { AccountSelector } from "@/components/input/AccountSelector";
import useDebounce from "@/components/menu/hook/useDebounce";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import styles from "@/components/WelcomeTour/components/Tour.module.css";
import WaPageTourSteps from "@/components/WelcomeTour/components/WaPageTourSteps";
import WelcomeTour from "@/components/WelcomeTour/WelcomeTour";
import { TemplateFilterSort } from "@/components/whatsapp/templates/FilterAndSort";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge";
import { docsPath } from "@/utils/constants";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) =>
      word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word,
    )
    .join(" ");
}

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

    return sortData(filtered, sortOption);
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

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-h-12.5 flex-wrap items-center gap-3">
          {data ? (
            <Button onClick={handleCreateClick} disabled={isPending}>
              {translations("Create Templates")}
              <IconPlus size={16} className="ml-2" />
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button onClick={handleCreateClick} disabled>
                    {translations("Create Templates")}
                    <IconPlus size={16} className="ml-2" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {translations(
                    "Connect a WhatsApp number in settings to create a Template",
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          <InfoButton docUrl={`${docsPath}/whatsapp/templates`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["watemplates"]} />
        </div>

        <div className="flex min-h-12.5 flex-wrap items-start gap-2.5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <TemplateFilterSort
            filters={filters}
            setFilters={setFilters}
            sortOption={sortOption}
            setSortOption={setSortOption}
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
        </div>
      </div>

      <TemplateCardList
        handleEditClick={handleEditClick}
        isError={isError}
        isPending={isPending}
        refetch={refetch}
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
    </div>
  );
}

const TemplateCardList = ({
  isPending,
  isError,
  refetch,
  sortedTemplates,
  toggle,
  handleEditClick,
  setSelectedTemplate,
}) => {
  if (isPending) return <TemplatesCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={refetch} />;
  if (!sortedTemplates?.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No templates found</EmptyTitle>
          <EmptyDescription>
            Try changing filters or create a new template.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedTemplates?.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          onClick={() => handleEditClick(t)}
          toggle={toggle}
          setSelectedTemplate={setSelectedTemplate}
        />
      ))}
    </div>
  );
};
function TemplateCard({ template, onClick, toggle, setSelectedTemplate }) {
  return (
    <Card
      className="h-full cursor-pointer hover:border-primary transition-colors border"
      onClick={onClick}
    >
      <CardContent className="px-4 flex flex-col justify-between h-full gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 overflow-hidden">
              <h3
                className="font-semibold text-lg truncate"
                title={template?.data?.name}
              >
                {template?.data?.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {template?.data?.category || "Template"}
              </p>
            </div>

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

              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        onClick={() => {
                          if (template?._count?.Campaign > 0) return;
                          setSelectedTemplate(template.id);
                          toggle();
                        }}
                        disabled={template?._count?.Campaign > 0}
                        variant="destructive"
                      >
                        <IconTrash size={16} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {template?._count?.Campaign > 0
                        ? "Cannot delete template with active campaigns"
                        : "Delete template"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2">
            <Badge variant="default" className="text-xs">
              {(template?.WhatsappSettings?.phoneDisplayName ||
                template?.whatsappSettingsPhoneId) ??
                "No Account"}
            </Badge>
            <WaTemplateStatusBadge
              status={template?.data?.category}
              defaultType
            />
            <WaTemplateStatusBadge
              status={template?.templateType}
              defaultType
            />
          </div>
        </div>

        <div>
          <Separator className="mb-3" />
          <div className="flex justify-between items-center">
            <WaTemplateStatusBadge status={template?.data?.status} />
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconCalendar size={18} />
              <CreatedSinceText createdAt={template.createdAt} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
