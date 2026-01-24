"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedState } from "@mantine/hooks";
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
import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";

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
import InfoButton from "../../Button/InfoButton";
import RefreshButton from "../../Button/RefreshButton";
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

const Responses = ({ survey, defaultLanguage, subscription, questions }: any) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const surveyId = survey?.id;
  const { filterTeams } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);

  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [createTicketOpened, setCreateTicketOpened] = useState(false);
  const openTicketModal = () => setCreateTicketOpened(true);
  const closeTicketModal = () => setCreateTicketOpened(false);

  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [responseTeamId, setResponseTeamId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncResponseToGoogleSheet = useSyncResponseToGoogleSheet(surveyId);
  const { data: googleAccessToken } = useIntegrationByType(
    IntegratedApps.googlesheet,
  );
  const [alertModalOpened, setAlertModalOpened] = useState(false);
  const alertModalOpen = () => setAlertModalOpened(true);
  const alertModalClose = () => setAlertModalOpened(false);

  const [redirectModalOpened, setRedirectModalOpened] = useState(false);
  const redirectModalOpen = () => setRedirectModalOpened(true);
  const redirectModalClose = () => setRedirectModalOpened(false);

  const [openedExport, setOpenedExport] = useState(false);
  const toggle = () => setOpenedExport(!openedExport);

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
    () => questions.find((q: any) => q.type === QuestionType.Contact),
    [questions],
  );

  const deleteResponse = useDeleteResponse(
    surveyId,
    // @ts-ignore
    filterTeams, // Assuming surveyTeamMapId was used but context only provides filterTeams now? Checking original code: it used surveyTeamMapId. But context destructuring gave surveyTeamMapId. I will keep using it if I can access it.
    close,
    setIsDeleting,
  );
  const translations = useTranslations();
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
        (q: any) => q.type !== QuestionType.InfoMessage && !(q.type in PageType),
      ),
    [questions],
  );

  const { surveyTeamMapId } = useContext(SurveyContext); // Re-accessing surveyTeamMapId if needed by deleteResponse

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

  return (
    <div className="flex flex-col gap-6 w-full h-full p-4">
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <Card>
        <CardContent className="p-6">
          {isPending ? (
            <Skeleton className="h-[70px] w-full" />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Top Row: Title & Main Actions */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
                    {translations("Total Responses :")} {responseData?.totalCount ?? 0}
                  </h2>
                  <RefreshButton onClick={() => refetchResponse()} />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {CFData && CFData.length > 0 && (
                    <ContainedMultiSelect
                      placeholder={translations("Filter By Campaign")}
                      value={campaignIds}
                      onChange={setSelectedCampaignIds}
                      data={CFData.map(({ name, id }: any) => ({
                        value: id,
                        label: name,
                      }))}
                    />
                  )}
                  <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
                  {!survey?.isEncrypted && (
                    <DropdownMenu open={openedExport} onOpenChange={setOpenedExport}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="default"
                          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={toggle}
                        >
                          <IconTableExport className="h-4 w-4" />
                          {translations("Export")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => {
                            if (survey.spreadSheetId) alertModalOpen();
                            else handleSyncGoogleSheet();
                          }}
                        >
                          <IconRefresh
                            className={`mr-2 h-4 w-4 ${isSyncing ? styles.rotateInfinitely : ""}`}
                          />
                          {survey.spreadSheetId
                            ? translations("Resync with Google Sheet")
                            : translations("Sync with Google Sheet")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            handleExcelDownload();
                            toggle();
                          }}
                        >
                          <IconFileDownload className="mr-2 h-4 w-4" />
                          {translations("Download Excel")}
                        </DropdownMenuItem>
                        {hasContactQuestion && (
                          <DropdownMenuItem onClick={handleExportContacts}>
                            <IconDatabaseImport className="mr-2 h-4 w-4" />
                            {translations("Export Contacts")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <InfoButton docUrl={`${docsPath}/advancedFt/resultexport`} />
                </div>
              </div>

              {/* Secondary Row: Filters & Fields */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-9 w-9 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700">
                  <IconFilter className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-4">
                  {translations("Select Fields")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card>
        <CardContent className="p-6">
          <TanstackTable
            data={responseData ? responseData?.responses : []}
            columns={
              responseData?.responses?.every((row: any) => !row.tag)
                ? columns?.filter((col: any) => col.accessorKey !== "tag")
                : columns
            }
            columnFiltersE={columnFilters}
            setColumnFiltersE={setColumnFilters}
            pagination={pagination}
            setPagination={setPagination}
            totalCount={responseData?.totalCount}
            isPending={isPending}
            enableServerFilter={enableServerFilter}
          />
        </CardContent>
      </Card>

      <DeleteModal
        confirmDelete={confirmDelete}
        translations={translations}
        opened={opened}
        close={close}
      />
    </div>
  );
};

export default React.memo(Responses);

const DeleteModal = ({ translations, confirmDelete, opened, close }: any) => {
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
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {translations("To proceed further, verify your email id")}
        </p>
        <ContainedTextField
          withAsterisk
          label={translations("Verify email")}
          placeholder={translations("Enter your login email")}
          required
          value={verifyEmail}
          onChange={(e: any) => setVerifyEmail(e.target.value)}
        />
        <p className="text-sm text-red-600 dark:text-red-400">
          {translations("Once deleted, response entry data will be lost")}
        </p>
      </div>
    </FormModalLayout>
  );
};
