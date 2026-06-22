"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useDebouncedState } from "@mantine/hooks";
import { IconTicket } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  IntegratedApps,
  QuestionType,
  QuestionType2,
  SubscriptionFeaturePathName,
  WaQuestions,
} from "@/types/enums.ts";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import { PAGE_SIZE } from "@/utils/constants.ts";
import { TicketType } from "@/utils/enums/ticket.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/utils/whatsapp/enumMap.ts";

import FormModalLayout from "../../Modal/FormModalLayout.tsx";
import { DataTable } from "../../Table/data-table.tsx";
import CreateTicketModal from "../../Tickets/CreateTicketModal.tsx";
import { WaHoverCardComponent } from "../HoverCard/WaHoverCard.tsx";
import { ActionMenu } from "./Columns.tsx";
import { ResponseTableToolbar } from "./ResponseTableToolbar.tsx";
import { useResponseFilterStore } from "./store.ts";

dayjs.extend(utc);
dayjs.extend(timezone);

const WaResponses = ({
  survey,
  defaultLanguage,
  selectedTeamId,
  subscription,
  questions,
}) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const surveyId = survey?.id;
  const { surveyTeamMapId, filterTeams, filterTags } =
    useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);

  const [openedExport, setOpenedExport] = useState(false);
  const toggle = () => setOpenedExport(!openedExport);
  const [alertMsg, setAlertMsg] = useState("");
  const [ranges, setRange] = useState<Range[]>([{ key: "selection" }]);
  const navigate = useNavigate();
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: CFData } = useCampaignFilterForFlows(surveyId);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
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
      !ranges.length || !ranges[0].startDate || !ranges[0].endDate
        ? []
        : [
            ranges[0]?.startDate.toISOString(),
            ranges[0]?.endDate.toISOString(),
          ],
    ...serverFilters,
  });

  const enableTicket = useMemo(
    () =>
      survey?.enableTickets &&
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    [subscription, survey],
  );

  const deleteResponse = useDeleteResponse(
    surveyId,
    surveyTeamMapId,
    close,
    setIsDeleting,
  );
  const { t: translations } = useTranslation();

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selection" }]);
    }
  }, [ranges]);

  if (Array.isArray(surveyId)) {
    throw new Error(translations("surveyId is an array"));
  }

  const exportContactMutation = useExportContactResponses(surveyId);

  const downloadExcelResponse = useDownloadExcelResponse();
  const handleExportContacts = useCallback(() => {
    toast.loading(translations("Exporting Contact responses to Contacts..."), {
      id: "export-contacts",
    });
    exportContactMutation.mutate();
  }, [exportContactMutation, translations]);

  const handleExcelDownload = useCallback(
    (columns) => {
      downloadExcelResponse.mutate({
        defaultLanguage,
        surveyId,
        visibleColumn: columns,
        title: survey?.title,
        tz: dayjs.tz.guess(),
        filterTeams,
        campaignIds: campaignIds,
        dbFlowId,
        columnFilters: [],
        ranges: ranges?.[0],
      });
    },
    [
      downloadExcelResponse,
      defaultLanguage,
      surveyId,
      survey?.title,
      filterTeams,
      campaignIds,
      dbFlowId,
      ranges,
    ],
  );

  useEffect(() => {
    if (selectedResponseId && responseTeamId) openTicketModal();
  }, [selectedResponseId, responseTeamId, openTicketModal]);

  useEffect(() => {
    if (!createTicketOpened) setSelectedResponseId("");
  }, [createTicketOpened]);

  const confirmDelete = useCallback(() => {
    toast.loading(translations("Hold on, response is getting deleted..."), {
      id: "load-data",
    });
    setIsDeleting(true);
    deleteResponse.mutate(selectedRowId);
  }, [deleteResponse, selectedRowId, translations]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: (info) =>
          dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
      },
      ...questions?.map((question) => ({
        id:
          question.label +
          "_,_" +
          QuestionType2[question.metaType] +
          "_,_" +
          question.id,
        accessorKey: question.id,
        accessorFn: (row) => {
          const response = row?.[question.id];
          if (
            [QuestionType.Rating, QuestionType.Opinion].includes(
              question.metaType,
            )
          ) {
            return Number(response);
          }
          return response;
        },
        header: markdownToPlainText(question.header || question.label),
        enableColumnFilter: ![
          WaQuestions.DocumentPicker,
          WaQuestions.PhotoPicker,
        ].includes(question.metaType),
        enableSorting: ![
          WaQuestions.DocumentPicker,
          WaQuestions.PhotoPicker,
        ].includes(question.metaType),
        cell: (info) => getCellData(info?.getValue(), question),
      })),
      {
        accessorKey: "mobile",
        header: "Respondent Mobile",
        id: "mobile",
      },
      {
        header: "Tags",
        accessorKey: "tags",
      },
      ...(enableTicket
        ? [
            {
              header: () => (
                <span className="text-lg font-semibold min-w-[70px] max-w-[70px] truncate block">
                  {translations("Ticket")}
                </span>
              ),
              enableColumnFilter: false,
              enableSorting: false,
              accessorKey: "ticket",
              cell: (info) => {
                const ticketData = info.row.original.Ticket;
                const ticketExist = ticketData?.length > 0;
                return (
                  <div
                    className="flex items-center justify-center pr-20 cursor-pointer"
                    onClick={() => {
                      if (ticketExist) {
                        const url = `/dashboard/tickets/${ticketData[0]?.id}`;
                        window.open(url, "_blank");
                      }
                    }}
                  >
                    {ticketExist && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <IconTicket color="orange" className="w-9 h-9" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {translations("View Ticket")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              },
            },
          ]
        : []),
      {
        accessorKey: "action",
        header: "Action",
        id: "Action",
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => (
          <ActionMenu
            open={open}
            resId={info.row.original.id}
            resTeamId={info.row.original.teamId}
            setSelectedResponseId={setSelectedResponseId}
            setResponseTeamId={setResponseTeamId}
            setSelectedRowId={setSelectedRowId}
            ticketData={info.row.original.Ticket}
            enableTicket={enableTicket}
          />
        ),
      },
    ],
    [open, questions],
  );

  const handleSyncGoogleSheet = useCallback(() => {
    setIsSyncing(true);
    if (!googleAccessToken) {
      setIsSyncing(false);
      setAlertMsg(
        translations("Please sync your Google account in the App & Services."),
      );
      redirectModalOpen();
    } else {
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
            toggle();
          },
          onError: (error: any) => {
            setIsSyncing(false);
            console.log(error);
            if (error.response.data?.error === "invalid_grant") {
              setAlertMsg(
                translations(
                  "Your access has been revoked. Please sign out and sign in again in the Apps & Services",
                ),
              );
              redirectModalOpen();
            } else {
              toggle();
              toast.error(
                error?.message || translations("Error in syncing response"),
              );
            }
          },
        },
      );
    }
  }, [
    googleAccessToken,
    redirectModalOpen,
    syncResponseToGoogleSheet,
    surveyId,
    toggle,
    translations,
  ]);

  useEffect(() => {
    if (refreshing) {
      setRefreshing(false);
    }
  }, [refreshing]);

  const disableTags = useRef(false);
  const data = useMemo(() => {
    return responseData?.responses?.map((item) => {
      if (!item.tag) {
        disableTags.current = true;
      }
      const row = {
        id: item.id,
        contactId: item.contactId,
        teamId: item.teamId || item.surveyTeamMap?.teamId,
        Ticket: item.Ticket,
        language: item.language,
        createdAt: item.createdAt,
        mobile: item?.phone || "N/A",
        tag: item.tag,
      };

      questions.forEach((question) => {
        const response = item.responses.find(
          (res) => res.questionId === question.id,
        );
        row[question.id] = response ? response.response : "";
      });

      return row;
    });
  }, [responseData?.responses, questions]);
  const isPending = isLoading || isRefetching;
  if (error)
    return (
      <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />
    );

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
      alertModalOpen,
      responseCount,
    ],
  );

  return (
    <div className="flex flex-col h-full">
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <div className="h-full px-6 p-2">
        <DataTable
          data={data ?? []}
          columns={
            disableTags.current
              ? columns?.filter((col) => col.accessorKey !== "tag")
              : columns
          }
          serverSide={{
            pagination,
            onPaginationChange: setPagination,
            rowCount: responseCount,
            columnFilters,
            onColumnFiltersChange: setColumnFilters,
          }}
          isPending={isPending}
          DataTableToolbar={Toolbar}
        />
      </div>
      <DeleteModal
        confirmDelete={confirmDelete}
        opened={opened}
        close={close}
      />
    </div>
  );
};

export default React.memo(WaResponses);

const DeleteModal = ({ confirmDelete, opened, close }) => {
  const { t: translations } = useTranslation();
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Delete Response")}
      centered
      buttonTitle={translations("Yes, Delete")}
      includeCancelButton
      onSubmit={() => {
        confirmDelete();
      }}
    >
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {translations("Are you sure you want to delete this response?")}
        </p>
        <p className="text-sm text-red-600 dark:text-red-400">
          {translations("Once deleted, response entry data will be lost.")}
        </p>
      </div>
    </FormModalLayout>
  );
};
export const getCellData = (info, question) => {
  switch (question.metaType) {
    case WaQuestions.LD:
      return LDResponseMap[info] || "";
    case WaQuestions.YN:
      return YNResponseMap[info] || "";
    case WaQuestions.Smiley:
      return SmileyResponseMap[info] || "";
    case WaQuestions.Rating:
      return RatingScaleMap[info] || "";
    case WaQuestions.Opinion:
      return info || "";
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return question.dataSource?.find((data) => data.id === info)?.title || "";
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (Array.isArray(info) &&
          info
            ?.map(
              (i) => question.dataSource?.find((data) => data.id === i)?.title,
            )
            ?.join(",")) ||
        ""
      );
    case WaQuestions.DocumentPicker:
      return (
        info && (
          <a
            href={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${info}`}
            download
            className="text-primary hover:underline"
          >
            Download
          </a>
        )
      );
    case WaQuestions.DatePicker:
      return info ? dayjs(info).format("DD-MM-YYYY") : "";
    case WaQuestions.TextArea:
    case WaQuestions.PhotoPicker:
      return <WaHoverCardComponent content={info} type={question.metaType} />;
    default:
      return info.toString() || "";
  }
};
