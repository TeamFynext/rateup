"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { useDebouncedState } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconFileDownload,
  IconFilter,
  IconRefresh,
  IconTableExport,
  IconTicket,
  IconX,
} from "@tabler/icons-react";
import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem";
import { hasFeature } from "@/utils/subscription/subscription";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/utils/whatsapp/enumMap";

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
  QuestionType,
  QuestionType2,
  SubscriptionFeaturePathName,
  WaQuestions,
} from "../../../types/enums";
import { docsPath, PAGE_SIZE } from "../../../utils/constants";
import { TicketType } from "../../../utils/enums/ticket";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import InfoButton from "../../Button/InfoButton";
import RefreshButton from "../../Button/RefreshButton";
import { useVisibleColumnStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import {
  ContainedMultiSelect,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";
import { DataTable } from "../../Table/data-table";
import CreateTicketModal from "../../Tickets/CreateTicketModal";
import { WaHoverCardComponent } from "../HoverCard/WaHoverCard";
import { ActionMenu } from "./Columns";
import { ResponseTableToolbar } from "./ResponseTableToolbar";
import { useResponseFilterStore } from "./store";

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
  const router = useRouter();
  const params = useParams();
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
  const translations = useTranslations();

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
    showLoadingToast(
      translations("Exporting Contact responses to Contacts"),
      "export-contacts",
      true,
    );
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
        header: "Tag",
        accessorKey: "tag",
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
                let ticketData = info.row.original.Ticket;
                let ticketExist = ticketData?.length > 0;
                return (
                  <div
                    className="flex items-center justify-center pr-20 cursor-pointer"
                    onClick={() => {
                      if (ticketExist) {
                        let url = `/dashboard/tickets/${ticketData[0]?.id}`;
                        window.open(url, "_blank");
                      }
                    }}
                  >
                    {ticketExist && (
                      <TooltipProvider>
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
                      </TooltipProvider>
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={responseTeamId}
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />

      <div className="h-full px-6 pb-2">
        <DataTable
          data={data ?? []}
          columns={
            disableTags.current
              ? columns?.filter((col) => col.accessorKey !== "tag")
              : columns
          }
          manualPagination={{
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
        translations={translations}
        opened={opened}
        close={close}
      />
    </div>
  );
};

export default React.memo(WaResponses);

const DeleteModal = ({ translations, confirmDelete, opened, close }) => {
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
          {translations("Once deleted, response entry data will be lost")}
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
            href={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${info}`}
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
