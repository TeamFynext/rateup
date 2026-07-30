import { IconTicket } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import type { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { useCampaignFilterForFlows } from "@/backend/campaign/campaign.query";
import {
  useDeleteResponse,
  useDownloadExcelResponse,
  useResponsesBySurvey,
  useSyncResponseToGoogleSheet,
} from "@/backend/surveys/response/response.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import type { DataTableToolbarProps } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { IntegratedApps, QuestionType, QuestionType2, WaQuestions } from "@/types/enums.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";
import { TicketType } from "@/utils/enums/ticket.ts";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/utils/whatsapp/enumMap.ts";

import { DataTable } from "../../Table/data-table.tsx";
import CreateTicketModal from "../../Tickets/CreateTicketModal.tsx";
import { WaHoverCardComponent } from "../HoverCard/WaHoverCard.tsx";
import { ActionMenu } from "./Columns.tsx";
import { ResponseTableToolbar } from "./ResponseTableToolbar.tsx";
import { useResponseFilterStore } from "./store.ts";

dayjs.extend(utc);
dayjs.extend(timezone);

/** A flow question, as the responses table needs it for column building. */
interface WaFlowQuestion {
  id: string;
  label?: string;
  header?: string;
  /** Flow questions reuse the survey question-type values for shared kinds. */
  metaType?: WaQuestions & QuestionType;
  dataSource?: Array<{ id: string; title?: string }>;
}

/** One response row returned by the flow-responses endpoint. */
interface WaResponseRow {
  id: string;
  createdAt: string;
  contactId?: string;
  teamId?: string;
  surveyTeamMap?: { teamId?: string };
  language?: string;
  phone?: string;
  tag?: string;
  Ticket?: Array<{ id: string }>;
  responses: Array<{ questionId?: string; response?: unknown }>;
  [key: string]: unknown;
}

/** The cell context these column definitions read. */
interface CellInfo {
  getValue: () => unknown;
  row: { original: WaResponseRow };
}

const WaResponses = ({
  survey,
  defaultLanguage,
  questions,
}: {
  survey: Survey;
  defaultLanguage: string;
  questions: WaFlowQuestion[];
}) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const surveyId = survey?.id;
  const { surveyTeamMapId, filterTeams } = useContext(SurveyContext);
  const [selectedRowId, setSelectedRowId] = useState("");

  const [, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createTicketOpened, setCreateTicketOpened] = useState(false);
  const openTicketModal = () => setCreateTicketOpened(true);
  const closeTicketModal = () => setCreateTicketOpened(false);

  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [responseTeamId, setResponseTeamId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncResponseToGoogleSheet = useSyncResponseToGoogleSheet(surveyId);
  const { data: googleAccessToken } = useIntegrationByType(IntegratedApps.googlesheet);

  const [, setAlertModalOpened] = useState(false);
  const alertModalOpen = () => setAlertModalOpened(true);

  const [, setRedirectModalOpened] = useState(false);
  const redirectModalOpen = () => setRedirectModalOpened(true);

  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);

  const [openedExport, setOpenedExport] = useState(false);
  const toggle = () => setOpenedExport(!openedExport);
  const [, setAlertMsg] = useState("");
  const [ranges, setRange] = useState<Range[]>([{ key: "selection" }]);

  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: CFData } = useCampaignFilterForFlows(surveyId);
  const [rawColumnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const columnFilters = useDebounce(rawColumnFilters, 200);
  const [campaignIds, setSelectedCampaignIds] = useState([]);
  const { serverFilters, setServerFilters } = useResponseFilterStore();
  useEffect(() => {
    setServerFilters([]);
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
        : [ranges[0]?.startDate.toISOString(), ranges[0]?.endDate.toISOString()],
    ...serverFilters,
  });

  // Tickets are free with no limits, so creation follows only the survey's toggle.
  const enableTicket = useMemo(() => survey?.enableTickets, [survey]);

  const deleteResponse = useDeleteResponse(surveyId, surveyTeamMapId, close);
  const { t: translations } = useTranslation();

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selection" }]);
    }
  }, [ranges]);

  if (Array.isArray(surveyId)) {
    throw new Error(translations("surveyId is an array"));
  }

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
        campaignIds: campaignIds,
        dbFlowId,
        format,
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
    if (selectedResponseId) openTicketModal();
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
        cell: (info: CellInfo) => dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
      },
      ...(questions?.map((question: WaFlowQuestion) => ({
        id: question.label + "_,_" + QuestionType2[question.metaType] + "_,_" + question.id,
        accessorKey: question.id,
        accessorFn: (row: Record<string, unknown>) => {
          const response = row?.[question.id];
          if ([QuestionType.Rating, QuestionType.Opinion].includes(question.metaType)) {
            return Number(response);
          }
          return response;
        },
        header: markdownToPlainText(question.header || question.label),
        enableColumnFilter: ![WaQuestions.DocumentPicker, WaQuestions.PhotoPicker].includes(
          question.metaType,
        ),
        enableSorting: ![WaQuestions.DocumentPicker, WaQuestions.PhotoPicker].includes(
          question.metaType,
        ),
        cell: (info: CellInfo) => getCellData(info?.getValue(), question),
      })) ?? []),
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
              cell: (info: CellInfo) => {
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
                        <TooltipTrigger render={<div />}>
                          <IconTicket color="orange" className="w-9 h-9" />
                        </TooltipTrigger>
                        <TooltipContent side="right">{translations("View Ticket")}</TooltipContent>
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
        cell: (info: CellInfo) => (
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
      setAlertMsg(translations("Please sync your Google account in the App & Services."));
      redirectModalOpen();
    } else {
      syncResponseToGoogleSheet.mutate(
        { surveyId },
        {
          onSuccess: () => {
            setIsSyncing(false);
            toast.success(translations("Response synced to Google sheet successfully"), {
              id: "success",
            });
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
              toast.error(error?.message || translations("Error in syncing response"));
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
    return responseData?.responses?.map((item: WaResponseRow) => {
      if (!item.tag) {
        disableTags.current = true;
      }
      const row: Record<string, unknown> = {
        id: item.id,
        contactId: item.contactId,
        teamId: item.teamId || item.surveyTeamMap?.teamId,
        Ticket: item.Ticket,
        language: item.language,
        createdAt: item.createdAt,
        mobile: item?.phone || "N/A",
        tag: item.tag,
      };

      questions.forEach((question: WaFlowQuestion) => {
        const response = item.responses.find(
          (res: { questionId?: string; response?: unknown }) => res.questionId === question.id,
        );
        row[question.id] = response ? response.response : "";
      });

      return row;
    });
  }, [responseData?.responses, questions]);
  const isPending = isLoading || isRefetching;
  if (error) return <ErrorComponent refetch={refetchResponse} isRefetching={isRefetching} />;

  const responseCount = responseData?.totalCount;

  const Toolbar = useCallback(
    (props: DataTableToolbarProps<WaResponseRow, unknown>) => (
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
        type={TicketType.SURVEY_RESPONSE}
        surveyResponseId={selectedResponseId}
      />
      <div className="h-full px-6 p-2">
        <DataTable
          data={data ?? []}
          columns={
            disableTags.current ? columns?.filter((col) => col.accessorKey !== "tag") : columns
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
      <DeleteModal confirmDelete={confirmDelete} opened={opened} close={close} />
    </div>
  );
};

export default React.memo(WaResponses);

const DeleteModal = ({
  confirmDelete,
  opened,
  close,
}: {
  confirmDelete: () => void;
  opened: boolean;
  close: () => void;
}) => {
  const { t: translations } = useTranslation();
  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations("Delete Response")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {translations("Are you sure you want to delete this response?")}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            {translations("Once deleted, response entry data will be lost.")}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {translations("Cancel")}
          </Button>
          <Button type="button" onClick={confirmDelete}>
            {translations("Yes, Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export const getCellData = (info: unknown, question: WaFlowQuestion) => {
  // The scale maps are keyed by the numeric answer value.
  const scaleKey = info as keyof typeof LDResponseMap;
  switch (question.metaType) {
    case WaQuestions.LD:
      return LDResponseMap[scaleKey] || "";
    case WaQuestions.YN:
      return YNResponseMap[scaleKey] || "";
    case WaQuestions.Smiley:
      return SmileyResponseMap[scaleKey] || "";
    case WaQuestions.Rating:
      return RatingScaleMap[scaleKey] || "";
    case WaQuestions.Opinion:
      return info || "";
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return question.dataSource?.find((data) => data.id === info)?.title || "";
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (Array.isArray(info) &&
          info?.map((i) => question.dataSource?.find((data) => data.id === i)?.title)?.join(",")) ||
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
      return info ? dayjs(info as string | number | Date).format("DD-MM-YYYY") : "";
    case WaQuestions.TextArea:
    case WaQuestions.PhotoPicker:
      return <WaHoverCardComponent content={info as ReactNode} type={question.metaType} />;
    default:
      return info.toString() || "";
  }
};
