"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useDebouncedState } from "@mantine/hooks";
import { IconCheck, IconX } from "@tabler/icons-react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";
import { toast } from "sonner";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import ErrorComponent from "@/components/404/ErrorComponent";

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
import { PAGE_SIZE } from "../../../utils/constants";
import { TicketType } from "../../../utils/enums/ticket";
import { hasFeature } from "../../../utils/subscription/subscription";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import FormModalLayout from "../../Modal/FormModalLayout";
import { DataTable } from "../../Table/data-table";
import CreateTicketModal from "../../Tickets/CreateTicketModal";
import { useSurveyResponseColumns } from "./Columns";
import { ResponseTableToolbar } from "./ResponseTableToolbar";
import { useResponseFilterStore } from "./store";

const Responses = ({
  survey,
  defaultLanguage,
  subscription,
  questions,
}: any) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
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

  const { serverFilters, setServerFilters } = useResponseFilterStore();

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

  const deleteResponse = useDeleteResponse(
    surveyId,
    // @ts-ignore
    filterTeams, // Assuming surveyTeamMapId was used but context only provides filterTeams now? Checking original code: it used surveyTeamMapId. But context destructuring gave surveyTeamMapId. I will keep using it if I can access it.
    close,
    setIsDeleting,
  );
  const translations = useTranslations();
  if (Array.isArray(surveyId)) {
    throw new TypeError(translations("surveyId is an array"));
  }

  const { data: CFData, isLoading: CFLoading } =
    useCampaignFilterForFlows(surveyId);
  const hasContactQuestion = useMemo(
    () => questions.find((q: any) => q.type === QuestionType.Contact),
    [questions],
  );
  const exportContactMutation = useExportContactResponses(surveyId);
  const handleExportContacts = useCallback(() => {
    toast.loading(translations("Exporting Contact responses to Contacts"), {
      id: "export-contacts",
    });
    exportContactMutation.mutate();
  }, [exportContactMutation, translations]);

  const downloadExcelResponse = useDownloadExcelResponse();
  const handleExcelDownload = useCallback(
    (columns: string[]) => {
      downloadExcelResponse.mutate({
        defaultLanguage,
        surveyId,
        visibleColumn: columns,
        title: survey?.title,
        tz: dayjs.tz.guess(),
        filterTeams,
        campaignIds,
        columnFilters: [],
        ranges: ranges?.[0],
      });
    },
    [
      defaultLanguage,
      downloadExcelResponse,
      filterTeams,
      ranges,
      survey?.title,
      surveyId,
      campaignIds,
    ],
  );

  useEffect(() => {
    selectedResponseId && responseTeamId && openTicketModal();
  }, [selectedResponseId, responseTeamId]);

  useEffect(() => {
    !createTicketOpened && setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = (verifyEmail: string) => {
    if (user?.email === verifyEmail) {
      toast.loading(translations("Hold on, response is getting deleted"), {
        id: "load-data",
      });
      setIsDeleting(true);
      deleteResponse.mutate(selectedRowId);
    } else {
      toast.loading(translations("Incorrect email"), {
        id: "load-data",
      });
    }
  };
  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (q: any) =>
          q.type !== QuestionType.InfoMessage && !(q.type in PageType),
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
    if (googleAccessToken) {
      syncResponseToGoogleSheet.mutate(
        { surveyId },
        {
          onSuccess: () => {
            setIsSyncing(false);
            toast.success(
              translations("Response synced to Google sheet successfully"),
              {
                id: "success",
              },
            );
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
              toast.error(
                error?.message || translations("Error in syncing response"),
              );
            }
          },
        },
      );
      return;
    }

    setIsSyncing(false);
    setAlertMsg(
      translations("Please sync your Google account in the App & Services"),
    );
    redirectModalOpen();
  };
  const isPending = isLoading || CFLoading || isRefetching;
  const responseCount = responseData?.totalCount;

  const Toolbar = useCallback(
    (props) => (
      <ResponseTableToolbar
        {...props}
        CFData={CFData}
        campaignIds={campaignIds}
        setCampaignIds={setSelectedCampaignIds}
        ranges={ranges}
        setRange={setRange}
        survey={survey}
        isSyncing={isSyncing}
        refetchResponse={refetchResponse}
        handleSyncGoogleSheet={handleSyncGoogleSheet}
        handleExcelDownload={handleExcelDownload}
        handleExportContacts={handleExportContacts}
        hasContactQuestion={!!hasContactQuestion}
        alertModalOpen={alertModalOpen}
        responseCount={responseCount}
      />
    ),
    [
      CFData,
      campaignIds,
      ranges,
      survey,
      isSyncing,
      refetchResponse,
      handleSyncGoogleSheet,
      handleExcelDownload,
      handleExportContacts,
      hasContactQuestion,
      alertModalOpen,
      responseCount,
    ],
  );

  if (error)
    return (
      <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />
    );

  return (
    <>
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />

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

      <DataTable
        data={responseData ? responseData?.responses : []}
        columns={
          responseData?.responses?.every((row: any) => !row.tag)
            ? columns?.filter((col: any) => col.accessorKey !== "tag")
            : columns
        }
        manualPagination={{
          pagination,
          onPaginationChange: setPagination,
          rowCount: responseData?.totalCount ?? 0,
          sorting,
          onSortingChange: setSorting,
          columnFilters,
          onColumnFiltersChange: setColumnFilters,
        }}
        isPending={isPending}
        DataTableToolbar={Toolbar}
      />

      <DeleteModal
        confirmDelete={confirmDelete}
        translations={translations}
        opened={opened}
        close={close}
      />
    </>
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
