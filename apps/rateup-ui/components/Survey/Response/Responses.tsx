"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { range, useDebouncedState, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabaseImport,
  IconFileDownload,
  IconFilter,
  IconRefresh,
  IconTableExport,
  IconX,
} from "@tabler/icons-react";
import { ColumnFiltersState, Table } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { selectCheckBox } from "@/components/Contacts/utils/utils";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import { DataTable } from "@/components/Table/data-table";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Filter } from "@/components/Table/Filter/Filter";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { useCampaignFilterForFlows } from "../../../backend/campaign/campaign.query";
import {
  useDeleteResponse,
  useDownloadExcelResponse,
  useExportContactResponses,
  useResponsesBySurvey,
  useSyncResponseToGoogleSheet,
} from "../../../backend/surveys/response/response.query";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import {
  IntegratedApps,
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "../../../types/enums";
import { docsPath, PAGE_SIZE } from "../../../utils/constants";
import { TicketType } from "../../../utils/enums/ticket";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import { hasFeature } from "../../../utils/subscription/subscription";
import { useVisibleColumnStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import {
  ContainedMultiSelect,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import FormModalLayout from "../../Modal/FormModalLayout";
import TanstackTable from "../../Table/TanstackTable";
import CreateTicketModal from "../../Tickets/CreateTicketModal";
import { useSurveyResponseColumns } from "./Columns";
import styles from "./Responses.module.css";
import { useResponseFilterStore } from "./store";

const Responses = ({ survey, defaultLanguage, subscription, questions }) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const surveyId = survey?.id;
  const { surveyTeamMapId, filterTeams, filterTags } =
    useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [
    createTicketOpened,
    { open: openTicketModal, close: closeTicketModal },
  ] = useDisclosure(false);
  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [responseTeamId, setResponseTeamId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncResponseToGoogleSheet = useSyncResponseToGoogleSheet(surveyId);
  const { data: googleAccessToken } = useIntegrationByType(
    IntegratedApps.googlesheet,
  );
  const [alertModalOpened, { open: alertModalOpen, close: alertModalClose }] =
    useDisclosure(false);
  const [
    redirectModalOpened,
    { open: redirectModalOpen, close: redirectModalClose },
  ] = useDisclosure(false);
  const [openedExport, { toggle }] = useDisclosure(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [ranges, setRange] = useState<Range[]>([
    {
      key: "selection",
    },
  ]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const router = useRouter();
  const [campaignIds, setSelectedCampaignIds] = useState([]);

  const { serverFilters, enableServerFilter, setServerFilters } =
    useResponseFilterStore();

  useEffect(() => {
    setServerFilters({});
  }, [survey]);

  const {
    data: responseData,
    isLoading,
    isRefetching,
    error,
    refetch: refetchResponse,
  } = useResponsesBySurvey(survey?.id, {
    page: pagination.pageIndex,
    limit: pagination.pageSize,
    surveyTeamMapIds: filterTeams,
    language: "",
    contactIds: [],
    campaignIds,
    dateRange:
      !ranges.length || !ranges[0]?.startDate || !ranges[0]?.endDate
        ? []
        : [ranges[0].startDate.toISOString(), ranges[0].endDate.toISOString()],
    ...serverFilters,
  });

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selection" }]);
    }
  }, [ranges]);

  const hasContactQuestion = useMemo(
    () => questions.find((q) => q.type === QuestionType.Contact),
    [questions],
  );

  const deleteResponse = useDeleteResponse(
    surveyId,
    surveyTeamMapId,
    close,
    setIsDeleting,
  );
  const translations = useTranslations();
  // TODO: find out why surveyId is an array
  if (Array.isArray(surveyId)) {
    throw new Error(translations("surveyId is an array"));
  }

  const exportContactMutation = useExportContactResponses(surveyId);
  const {
    data: CFData,
    error: CFError,
    isLoading: CFLoading,
  } = useCampaignFilterForFlows(surveyId);
  const downloadExcelResponse = useDownloadExcelResponse();
  function handleExportContacts() {
    showLoadingToast(
      translations("Exporting Contact responses to Contacts"),
      "export-contacts",
      true,
    );
    exportContactMutation.mutate();
  }
  const handleExcelDownload = useCallback(() => {
    downloadExcelResponse.mutate({
      defaultLanguage,
      surveyId,
      visibleColumn: Array.from(
        new Set(useVisibleColumnStore.getState().visibleColumn),
      ),
      title: survey?.title,
      tz: dayjs.tz.guess(),
      filterTeams,
      campaignIds,
      columnFilters,
      ranges: ranges?.[0],
    });
  }, [
    columnFilters,
    defaultLanguage,
    downloadExcelResponse,
    filterTeams,
    ranges,
    survey?.title,
    surveyId,
    campaignIds,
  ]);

  useEffect(() => {
    selectedResponseId && responseTeamId && openTicketModal();
  }, [selectedResponseId, responseTeamId]);

  useEffect(() => {
    !createTicketOpened && setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = (verifyEmail: string) => {
    if (user?.email === verifyEmail) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: translations("Deleting Response"),
        message: translations("Hold on, response is getting deleted"),
        autoClose: false,
        withCloseButton: false,
      });
      setIsDeleting(true);
      deleteResponse.mutate(selectedRowId);
    } else {
      notifications.show({
        id: "load-data",
        color: "red",
        title: translations("Error"),
        message: translations("Incorrect email"),
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    }
  };
  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.type !== QuestionType.InfoMessage && !(q.type in PageType),
      ),
    [questions],
  );
  const columns = useSurveyResponseColumns({
    questions: filteredQuestions,
    defaultLanguage,
    setSelectedRowId,
    open,
    setSelectedResponseId,
    setResponseTeamId,
    enableTicket:
      survey?.enableTickets &&
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    surveyId: survey?.id,
    typeWa:
      survey?.type === SurveyType.WhatsApp ||
      survey?.type === SurveyType.WaFlow,
  });

  const handleSyncGoogleSheet = () => {
    setIsSyncing(true);
    if (!googleAccessToken) {
      setIsSyncing(false);
      setAlertMsg(
        translations("Please sync your Google account in the App & Services"),
      );
      redirectModalOpen();
    } else {
      syncResponseToGoogleSheet.mutate(
        { surveyId },
        {
          onSuccess: () => {
            setIsSyncing(false);
            showSuccessToast(
              translations("Response synced to Google sheet successfully"),
              "success",
              <IconCheck />,
            );
            toggle();
          },
          onError: (error: any) => {
            setIsSyncing(false);
            console.log(error);
            if (error.response.data?.error === "invalid_grant") {
              setAlertMsg(
                translations(
                  "Your access has been revoked Please sign out and sign in again in the Apps & Services",
                ),
              );
              redirectModalOpen();
            } else {
              toggle();
              showErrorToast(translations("Error in syncing response"));
            }
          },
        },
      );
    }
  };
  const isPending = isLoading || CFLoading || isRefetching;

  if (error)
    return (
      <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />
    );
  const column = [
    ...selectCheckBox,
    ...(responseData?.responses?.every((row) => !row.tag)
      ? columns.filter((col: any) => col.accessorKey !== "tag")
      : columns),
  ];

  const defaultVisibility = column.reduce(
    (visibility, col) => {
      const key = (col as any)?.accessorKey ?? col.id;

      visibility[key] = true;
      visibility["select"] = true;

      return visibility;
    },

    {} as Record<string, boolean>,
  );

  return (
    <div className="h-full flex flex-col gap-4">
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <div className="">
        {isPending ? (
          <Skeleton className="h-[70px] w-full rounded-lg" />
        ) : (
          <div className="flex flex-col gap-4 w-full p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* LEFT */}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-medium">
                {translations("Total Responses :")}{" "}
                <span className="font-semibold">
                  {responseData?.totalCount ?? 0}
                </span>
              </h1>

              <Button variant="ghost" onClick={() => refetchResponse()}>
                <IconRefresh className="text-primary" />
              </Button>
            </div>

            {/* RIHGT */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <CalenderIconDateRangePicker
                ranges={ranges}
                setRange={setRange}
              />

              {CFData && CFData.length > 0 && (
                <ContainedMultiSelect
                  placeholder={translations("Filter By Campaign")}
                  value={campaignIds}
                  onChange={setSelectedCampaignIds}
                  data={CFData.map(({ name, id }) => ({
                    value: id,
                    label: name,
                  }))}
                  className="w-full sm:w-[220px]"
                />
              )}

              {!survey?.isEncrypted && (
                <Popover open={openedExport} onOpenChange={toggle}>
                  <PopoverTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <IconTableExport className="mr-2 h-4 w-4" />
                      {translations("Export")}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    side="bottom"
                    className={styles["filters-popover-dropdown-div"]}
                  >
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          if (survey.spreadSheetId) alertModalOpen();
                          else handleSyncGoogleSheet();
                        }}
                      >
                        <IconRefresh
                          className={
                            isSyncing ? styles.rotateInfinitely : undefined
                          }
                        />
                        <span className="ml-2">
                          {survey.spreadSheetId
                            ? translations("Resync with Google Sheet")
                            : translations("Sync with Google Sheet")}
                        </span>
                      </Button>

                      <Button
                        onClick={() => {
                          handleExcelDownload();
                          toggle();
                        }}
                        className="flex items-center gap-2"
                      >
                        <IconFileDownload stroke={1.5} />
                        {translations("Download Excel")}
                      </Button>

                      {hasContactQuestion && (
                        <Button
                          onClick={handleExportContacts}
                          className="flex items-center gap-2"
                        >
                          <IconDatabaseImport stroke={1.5} />
                          {translations("Export Contacts")}
                        </Button>
                      )}

                      {/* Modals */}
                      <ConfirmationModal
                        opened={alertModalOpened}
                        onClose={alertModalClose}
                        headerTitle={translations("Resync Google Sheet")}
                        headerLabel={translations(
                          "Are you sure you want to resync the response to sheet? All previous changes made to the sheet will be lost",
                        )}
                        confirmLabel={translations("Yes")}
                        onConfirm={handleSyncGoogleSheet}
                      />

                      <ConfirmationModal
                        opened={redirectModalOpened}
                        onClose={redirectModalClose}
                        headerTitle={translations("Sync Google Sheet")}
                        headerLabel={alertMsg}
                        confirmLabel={translations("Continue")}
                        onConfirm={() => {
                          router.push("/dashboard/apps&services/googlesheet");
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="">
        <DataTable
          columns={column}
          data={responseData ? responseData?.responses : []}
          DataTableToolbar={DataTableToolbar}
          manualPagination={{
            pagination,
            onPaginationChange: setPagination,
            rowCount: responseData?.totalCount || 0,
          }}
          isPending={isPending}
          defaultColumnVisibility={defaultVisibility}
        />

        <DeleteModal
          confirmDelete={confirmDelete}
          translations={translations}
          opened={opened}
          close={close}
        />
      </div>
    </div>
  );
};

export default React.memo(Responses);

const DeleteModal = ({ translations, confirmDelete, opened, close }) => {
  const [verifyEmail, setVerifyEmail] = useState("");
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Delete Response")}
      centered
      buttonTitle={translations("Delete")}
      includeCancelButton
      onSubmit={() => {
        confirmDelete(verifyEmail);
        setVerifyEmail("");
      }}
    >
      <div className="py-4">
        <p>{translations("To proceed further, verify your email id")}</p>
        <ContainedTextField
          withAsterisk
          label={translations("Verify email")}
          placeholder={translations("Enter your login email")}
          required
          value={verifyEmail}
          onChange={(e) => setVerifyEmail(e.target.value)}
        />
        <p className="text-red-500">
          {translations("Once deleted, response entry data will be lost")}
        </p>
      </div>
    </FormModalLayout>
  );
};

function DataTableToolbar({ table, columnFilters }) {
  const { setServerFilters } = useResponseFilterStore();

  const filterableColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getCanFilter() && col.id !== "action");

  function handleApplyFilters() {
    setServerFilters(
      columnFilters.reduce((acc, c) => {
        if (!c.value || c.value.length === 0) return acc;

        const id = c.id.includes("_,_") ? c.id.split("_,_").pop() : c.id;

        acc[id] = c.value;
        return acc;
      }, {}),
    );
  }

  function handleClearFilters() {
    table.resetColumnFilters();
    setServerFilters({});
  }

  return (
    <div className="flex items-center gap-2 justify-end p-2">
      <DataTableViewOptions table={table} />
      {/* FILTER DRAWER */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <IconFilter className="mr-2 h-3 w-3" />
            Filters
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[420px] rounded-xl p-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-1">
              <IconFilter className="h-4 w-4" />
              Filters
            </SheetTitle>
          </SheetHeader>

          {/* FILTERS */}
          <div className="flex flex-col gap-4">
            {filterableColumns.map((col) => (
              <div key={col.id}>
                <label className="text-sm font-medium">
                  {col.id?.split("_,_")?.[0]}
                </label>
                <Filter column={col} table={table} />
              </div>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
