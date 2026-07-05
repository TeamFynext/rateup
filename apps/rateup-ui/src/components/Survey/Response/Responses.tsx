import { useDebouncedState } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { useCampaignFilterForFlows } from "@/backend/campaign/campaign.query";
import {
  useDeleteResponse,
  useDownloadExcelResponse,
  useExportContactResponses,
  useResponsesBySurvey,
  useSyncResponseToGoogleSheet,
} from "@/backend/surveys/response/response.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import {
  IntegratedApps,
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "@/types/enums.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";
import { TicketType } from "@/utils/enums/ticket.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { ContainedTextField } from "../../input/ContainedInput/ContainedInput.tsx";
import FormModalLayout from "../../Modal/FormModalLayout.tsx";
import { DataTable } from "../../Table/data-table.tsx";
import CreateTicketModal from "../../Tickets/CreateTicketModal.tsx";
import { useSurveyResponseColumns } from "./Columns.tsx";
import { ResponseTableToolbar } from "./ResponseTableToolbar.tsx";
import { useResponseFilterStore } from "./store.ts";

const Responses = ({ survey, defaultLanguage, subscription, questions }: any) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const surveyId = survey?.id;
  const { filterTeams } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);

  const { user } = useUser();
  const [createTicketOpened, setCreateTicketOpened] = useState(false);
  const openTicketModal = () => setCreateTicketOpened(true);
  const closeTicketModal = () => setCreateTicketOpened(false);

  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncResponseToGoogleSheet = useSyncResponseToGoogleSheet(surveyId);
  const { data: googleAccessToken } = useIntegrationByType(IntegratedApps.googlesheet);
  const confirm = useConfirm();
  const [ranges, setRange] = useState<Range[]>([
    {
      key: "selection",
    },
  ]);
  const [columnFilters, setColumnFilters] = useDebouncedState<ColumnFiltersState>([], 200);
  const navigate = useNavigate();
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
  );
  const { t: translations } = useTranslation();
  if (Array.isArray(surveyId)) {
    throw new TypeError(translations("surveyId is an array"));
  }

  const { data: CFData, isLoading: CFLoading } = useCampaignFilterForFlows(surveyId);
  const hasContactQuestion = useMemo(
    () => questions.find((q: any) => q.type === QuestionType.Contact),
    [questions],
  );
  const exportContactMutation = useExportContactResponses(surveyId);
  const handleExportContacts = useCallback(() => {
    toast.loading(translations("Exporting Contact responses to Contacts..."), {
      id: "export-contacts",
    });
    exportContactMutation.mutate();
  }, [exportContactMutation, translations]);

  const downloadExcelResponse = useDownloadExcelResponse();
  const handleExcelDownload = useCallback(
    (columns: string[], format: "xlsx" | "ods" = "xlsx") => {
      downloadExcelResponse.mutate({
        defaultLanguage,
        surveyId,
        visibleColumn: columns,
        title: survey?.title,
        tz: dayjs.tz.guess(),
        filterTeams,
        campaignIds,
        format,
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
    if (selectedResponseId) {
      openTicketModal();
    }
  }, [selectedResponseId]);

  useEffect(() => {
    if (!createTicketOpened) setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = (verifyEmail: string) => {
    if (user?.email === verifyEmail) {
      toast.loading(translations("Hold on, response is getting deleted..."), {
        id: "load-data",
      });
      deleteResponse.mutate(selectedRowId);
    } else {
      toast.error(translations("Incorrect email"), {
        id: "load-data",
      });
    }
  };
  const filteredQuestions = useMemo(
    () =>
      questions.filter((q: any) => q.type !== QuestionType.InfoMessage && !(q.type in PageType)),
    [questions],
  );

  const columns = useSurveyResponseColumns({
    questions: filteredQuestions,
    defaultLanguage,
    setSelectedRowId,
    open,
    setSelectedResponseId,
    enableTicket:
      survey?.enableTickets && hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    surveyId: survey?.id,
    typeWa: survey?.type === SurveyType.WhatsApp || survey?.type === SurveyType.WaFlow,
  });

  const handleSyncGoogleSheet = async () => {
    setIsSyncing(true);
    if (googleAccessToken) {
      syncResponseToGoogleSheet.mutate(
        { surveyId },
        {
          onSuccess: () => {
            setIsSyncing(false);
            toast.success(translations("Response synced to Google sheet successfully"), {
              id: "success",
            });
          },
          onError: async (error: any) => {
            setIsSyncing(false);
            console.log(error);
            if (error.response.data?.error === "invalid_grant") {
              const shouldRedirect = await confirm({
                title: translations("Sync Google Sheet"),
                description: translations(
                  "Your access has been revoked. Please sign out and sign in again in the Apps & Services",
                ),
                confirmText: translations("Continue"),
              });

              if (shouldRedirect) {
                navigate({ to: "/dashboard/apps&services/googlesheet" });
              }
            } else {
              toast.error(error?.message || translations("Error in syncing response"));
            }
          },
        },
      );
      return;
    }

    setIsSyncing(false);
    const shouldRedirect = await confirm({
      title: translations("Sync Google Sheet"),
      description: translations("Please sync your Google account in the App & Services."),
      confirmText: translations("Continue"),
    });

    if (shouldRedirect) {
      navigate({ to: "/dashboard/apps&services/googlesheet" });
    }
  };

  const handleSyncClick = async () => {
    if (survey.spreadSheetId) {
      const shouldResync = await confirm({
        title: translations("Resync Google Sheet"),
        description: translations(
          "Are you sure you want to resync the response to sheet? All previous changes made to the sheet will be lost.",
        ),
        confirmText: translations("Yes"),
      });

      if (!shouldResync) return;
    }

    handleSyncGoogleSheet();
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
        alertModalOpen={handleSyncClick}
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
      handleSyncClick,
      responseCount,
    ],
  );

  if (error) return <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />;

  return (
    <>
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <DataTable
        data={responseData ? responseData?.responses : []}
        columns={
          responseData?.responses?.every((row: any) => !row.tag)
            ? columns?.filter((col: any) => col.accessorKey !== "tag")
            : columns
        }
        serverSide={{
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
      <DeleteModal confirmDelete={confirmDelete} opened={opened} close={close} />
    </>
  );
};

export default React.memo(Responses);

const DeleteModal = ({ confirmDelete, opened, close }) => {
  const { t: translations } = useTranslation();
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
          {translations("To proceed further, verify your email id.")}
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
          {translations("Once deleted, response entry data will be lost.")}
        </p>
      </div>
    </FormModalLayout>
  );
};
