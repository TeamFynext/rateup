import { IconInbox } from "@tabler/icons-react";
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
import { BINARY_COLORS, SCALE_10, SCALE_5 } from "@/components/common/sentimentScale.ts";
import type { DataTableToolbarProps } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { IntegratedApps, QuestionType, QuestionType2, WaQuestions } from "@/types/enums.ts";
import { getApiErrorData } from "@/utils/apiError.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/utils/whatsapp/enumMap.ts";

import { DataTable } from "../../Table/data-table.tsx";
import { WaHoverCardComponent } from "../HoverCard/WaHoverCard.tsx";
import { ActionMenu } from "./Columns.tsx";
import { ResponseTableToolbar } from "./ResponseTableToolbar.tsx";
import { useResponseFilterStore } from "./store.ts";

dayjs.extend(utc);
dayjs.extend(timezone);

/** A flow question, as the responses table needs it for column building. */
/** Answers rendered as numbers rather than labels. */
const NUMERIC_ANSWER_TYPES: Array<QuestionType | WaQuestions | undefined> = [
  QuestionType.Rating,
  QuestionType.Opinion,
];
/** Answers that are uploaded files, so neither filterable nor sortable. */
const ATTACHMENT_ANSWER_TYPES: Array<QuestionType | WaQuestions | undefined> = [
  WaQuestions.DocumentPicker,
  WaQuestions.PhotoPicker,
];

export interface WaFlowQuestion {
  id: string;
  label?: string;
  header?: string;
  /** Flow questions reuse the survey question-type values for shared kinds. */
  metaType?: WaQuestions | QuestionType;
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
  const [campaignIds, setSelectedCampaignIds] = useState<string[]>([]);
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
      !ranges.length || !ranges[0].startDate || !ranges[0].endDate
        ? []
        : [ranges[0]?.startDate.toISOString(), ranges[0]?.endDate.toISOString()],
    ...serverFilters,
  });

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
        cell: (info: CellInfo) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {dayjs(info.getValue() as string).format("DD MMM, hh:mm A")}
          </span>
        ),
      },
      {
        accessorKey: "mobile",
        header: "Respondent",
        id: "mobile",
        cell: (info: CellInfo) => (
          <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
            {String(info.getValue() ?? "")}
          </span>
        ),
      },
      ...(questions?.map((question: WaFlowQuestion) => ({
        id:
          question.label +
          "_,_" +
          QuestionType2[question.metaType as keyof typeof QuestionType2] +
          "_,_" +
          question.id,
        accessorKey: question.id,
        accessorFn: (row: Record<string, unknown>) => {
          const response = row?.[question.id];
          if (NUMERIC_ANSWER_TYPES.includes(question.metaType)) {
            return Number(response);
          }
          return response;
        },
        header: markdownToPlainText(question.header || question.label || ""),
        enableColumnFilter: !ATTACHMENT_ANSWER_TYPES.includes(question.metaType),
        enableSorting: !ATTACHMENT_ANSWER_TYPES.includes(question.metaType),
        cell: (info: CellInfo) => getCellData(info?.getValue(), question),
      })) ?? []),
      {
        header: "Tags",
        accessorKey: "tag",
      },
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
            setSelectedRowId={setSelectedRowId}
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
          onError: (error) => {
            setIsSyncing(false);
            console.log(error);
            if (getApiErrorData(error)?.error === "invalid_grant") {
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
  // Only the unfiltered empty table gets the empty state; a filter with no matches keeps
  // the toolbar so it can be cleared.
  const hasNoResponses =
    !isPending &&
    responseCount === 0 &&
    columnFilters.length === 0 &&
    campaignIds.length === 0 &&
    !ranges[0]?.startDate;

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
    <div className="flex h-full flex-col">
      <div className="h-full px-4 py-2 sm:px-6">
        {hasNoResponses ? (
          <Empty className="min-h-[50vh]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconInbox />
              </EmptyMedia>
              <EmptyTitle>{translations("No responses yet")}</EmptyTitle>
              <EmptyDescription>
                {translations("Share the flow on WhatsApp and answers will show up here.")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
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
        )}
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
          <p className="text-sm text-foreground">
            {translations("Are you sure you want to delete this response?")}
          </p>
          <p className="text-sm text-destructive ">
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
/** A scale answer: its label, led by a dot in the scale's colour. */
function ScaleAnswer({ label, color }: Readonly<{ label: ReactNode; color?: string }>) {
  if (!label) return "";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {color && (
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      )}
      {label}
    </span>
  );
}

function ChoiceBadges({ titles }: Readonly<{ titles: string[] }>) {
  if (!titles.length) return "";
  return (
    <span className="flex flex-wrap gap-1">
      {titles.map((title) => (
        <Badge key={title} variant="secondary" className="font-normal">
          {title}
        </Badge>
      ))}
    </span>
  );
}

export const getCellData = (info: unknown, question: WaFlowQuestion) => {
  // The scale maps are keyed by the numeric answer value.
  const scaleKey = info as keyof typeof LDResponseMap;
  const step = Number(info);
  const titleOf = (id: unknown) => question.dataSource?.find((data) => data.id === id)?.title;
  switch (question.metaType) {
    case WaQuestions.LD:
      return (
        <ScaleAnswer
          label={LDResponseMap[scaleKey]}
          color={step === 1 ? BINARY_COLORS.positive : BINARY_COLORS.negative}
        />
      );
    case WaQuestions.YN:
      return (
        <ScaleAnswer
          label={YNResponseMap[scaleKey]}
          color={step === 1 ? BINARY_COLORS.positive : BINARY_COLORS.negative}
        />
      );
    case WaQuestions.Smiley:
      return <ScaleAnswer label={SmileyResponseMap[scaleKey]} color={SCALE_5[step - 1]} />;
    case WaQuestions.Rating:
      return (
        <ScaleAnswer
          label={RatingScaleMap[scaleKey] && `${step}/5 · ${RatingScaleMap[scaleKey]}`}
          color={SCALE_5[step - 1]}
        />
      );
    case WaQuestions.Opinion:
      return <ScaleAnswer label={info ? `${step}/10` : ""} color={SCALE_10[step - 1]} />;
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown: {
      const title = titleOf(info);
      return title ? <ChoiceBadges titles={[title]} /> : "";
    }
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        <ChoiceBadges
          titles={(Array.isArray(info) ? info : [])
            .map(titleOf)
            .filter((title): title is string => Boolean(title))}
        />
      );
    case WaQuestions.OptIn:
      return info === true || info === "true" ? "Opted in" : "—";
    case WaQuestions.DocumentPicker:
      return info ? (
        <a
          href={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${info}`}
          download
          className="text-primary hover:underline"
        >
          Download
        </a>
      ) : (
        ""
      );
    case WaQuestions.DatePicker:
      return info ? dayjs(info as string | number | Date).format("DD MMM YYYY") : "";
    case WaQuestions.TextArea:
    case WaQuestions.PhotoPicker:
      return <WaHoverCardComponent content={info as ReactNode} type={question.metaType} />;
    default:
      return String(info ?? "") || "";
  }
};
