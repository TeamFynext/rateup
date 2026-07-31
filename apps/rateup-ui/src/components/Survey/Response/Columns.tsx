import { IconTicket } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ChevronDown, Eye, Ticket, Trash2 } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { PageType, QuestionType } from "@/types/enums.ts";
import { getFileNameFromKey, getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import type { StoredResponse } from "@/utils/response.ts";
import { getResponse, getResponseArrayByQuestionType } from "@/utils/response.ts";

import { HoverCardComponent } from "../HoverCard/HoverCard.tsx";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util.tsx";
import { fuzzyFilter } from "./Filter.ts";

/** The cell context these response column definitions read. */
interface ResponseCellInfo {
  getValue: () => StoredResponse;
  row: { original: { Ticket?: Array<{ id: string }>; [key: string]: unknown } };
}

/** Rating/opinion/number answers sort and filter numerically. */
const NUMERIC_QUESTION_TYPES: Array<QuestionType | PageType> = [
  QuestionType.Rating,
  QuestionType.Opinion,
  QuestionType.Number,
];
const isNumericQuestion = (type: QuestionType | PageType) => NUMERIC_QUESTION_TYPES.includes(type);

/** Attachment answers are neither filterable nor sortable in the table. */
const UNFILTERABLE_QUESTION_TYPES: Array<QuestionType | PageType> = [
  QuestionType.DocumentPicker,
  QuestionType.PhotoPicker,
  QuestionType.Photo,
  QuestionType.PCQ,
];

/** A response row, as the responses table holds it. */
export interface ResponseRow {
  id?: string;
  phone?: string;
  surveyTeamMapId?: string;
  teamId?: string;
  responses?: Array<QuestionResponse>;
  Ticket?: Array<{ id: string }>;
  createdAt?: string;
  [key: string]: unknown;
}

/** A stored answer keyed by question type, as a response row carries it. */
type ResponseByType = QuestionResponse["response"];

export const useSurveyResponseColumns = ({
  questions = [],
  defaultLanguage,
  setSelectedRowId,
  setSelectedRowSurveyTeamMapId,
  open,
  setSelectedResponseId,
  setResponseTeamId,
  enableTicket,
  surveyId,
  typeWa = false,
}: Readonly<{
  questions?: Question[];
  defaultLanguage?: string;
  setSelectedRowId?: (id: string) => void;
  setSelectedRowSurveyTeamMapId?: (id: string) => void;
  open?: () => void;
  setSelectedResponseId?: (id: string) => void;
  setResponseTeamId?: (id: string) => void;
  enableTicket?: boolean;
  surveyId?: string;
  typeWa?: boolean;
}>) => {
  const { t: translations } = useTranslation();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  // The definitions are assembled per question, so their accessor shapes differ.
  const column: ColumnDef<ResponseRow, StoredResponse>[] = useMemo(
    () => [
      {
        header: translations("Created At"),
        filterFn: fuzzyFilter,
        accessorKey: "createdAt",
        cell: (info: ResponseCellInfo) =>
          dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
      },
      ...(questions?.length > 0
        ? questions.map((q) => {
            const content =
              getReplacedTitleFromVariable({
                title: q?.title[selectedLanguage ? selectedLanguage : (defaultLanguage ?? "")],
                surveyId: surveyId ?? "",
              }) ||
              q?.title[selectedLanguage ? selectedLanguage : defaultLanguage] ||
              q?.description[selectedLanguage ? selectedLanguage : defaultLanguage] ||
              q?.label?.[selectedLanguage ? selectedLanguage : defaultLanguage] ||
              "";
            return {
              ...(!isNumericQuestion(q?.type) && {
                filterFn: fuzzyFilter,
              }),
              accessorFn: (row: ResponseRow) => {
                const response = row.responses
                  ?.filter((item: QuestionResponse) => item?.questionId === q.id)
                  ?.find((item: QuestionResponse) => item?.type === q.type)?.response[
                  q.type as keyof ResponseByType
                ];
                if (isNumericQuestion(q.type)) {
                  return Number(response);
                }

                return response;
              },
              id: content + "_,_" + q.type + "_,_" + q.id,
              header: () => {
                if (content.length > 25) {
                  return (
                    <HoverCard>
                      <HoverCardTrigger render={<span className="cursor-pointer" />}>
                        {`${content.substring(0, 25)}...`}
                      </HoverCardTrigger>
                      <HoverCardContent className="w-fit max-w-[400px] break-words whitespace-normal font-normal">
                        {content}
                      </HoverCardContent>
                    </HoverCard>
                  );
                }
                return content;
              },
              enableColumnFilter: !UNFILTERABLE_QUESTION_TYPES.includes(q.type),
              enableSorting: !UNFILTERABLE_QUESTION_TYPES.includes(q.type),
              cell: (info: ResponseCellInfo) => {
                return (
                  <BadgeorTextorPreview
                    questionType={q?.type}
                    response={getResponse(q, info.getValue())}
                  />
                );
              },
            };
          })
        : []),
      {
        header: translations("Tags"),
        accessorKey: "tag",
        cell: (info: ResponseCellInfo) => info.getValue(),
      },
      ...(typeWa
        ? [
            {
              header: "Respondent&apos;s Mobile Number",
              filterFn: fuzzyFilter,
              accessorFn: (row: ResponseRow) => row?.phone,
              id: "respondentsMobileNumber",
              cell: (info: ResponseCellInfo) => info.getValue(),
            },
          ]
        : []),
      ...(enableTicket
        ? [
            {
              header: translations("Ticket"),
              enableColumnFilter: false,
              enableSorting: false,
              accessorKey: "ticket",
              cell: (info: ResponseCellInfo) => {
                const ticketData = info.row.original.Ticket;
                const ticket = ticketData?.[0];

                if (!ticket) return null;

                return (
                  <div className="flex items-center justify-center pr-20">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={translations("View Ticket")}
                            className="h-9 w-9 rounded focus-visible:ring-orange-500"
                            onClick={() =>
                              window.open(
                                `/dashboard/tickets/${ticket.id}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          />
                        }
                      >
                        <IconTicket color="orange" className="w-9 h-9" />
                      </TooltipTrigger>
                      <TooltipContent side="right">{translations("View Ticket")}</TooltipContent>
                    </Tooltip>
                  </div>
                );
              },
            },
          ]
        : []),
      {
        header: translations("Action"),
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info: ResponseCellInfo) => {
          return (
            <ActionMenu
              open={open}
              resId={info.row.original.id as string | undefined}
              resTeamId={info.row.original.teamId as string | undefined}
              resSurveyTeamMapId={info.row.original.surveyTeamMapId as string | undefined}
              setSelectedResponseId={setSelectedResponseId}
              setResponseTeamId={setResponseTeamId}
              setSelectedRowId={setSelectedRowId}
              setSelectedRowSurveyTeamMapId={setSelectedRowSurveyTeamMapId}
              ticketData={info.row.original.Ticket}
              enableTicket={enableTicket}
            />
          );
        },
        accessorKey: "action",
      },
    ],
    [
      questions,
      translations,
      enableTicket,
      selectedLanguage,
      surveyId,
      defaultLanguage,
      typeWa,
      open,
      setSelectedResponseId,
      setResponseTeamId,
      setSelectedRowId,
    ],
  );
  return column;
};

const previewRequired: Array<QuestionType | PageType> = [
  QuestionType.Photo,
  QuestionType.PhotoPicker,
];
const badgeRequired: Array<QuestionType | PageType> = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
];
function BadgeorTextorPreview({
  questionType,
  response,
}: Readonly<{
  questionType: QuestionType | PageType;
  response: ReturnType<typeof getResponse>;
}>) {
  const { t: translations } = useTranslation();
  const [previewModalOpened, setPreviewModalOpened] = useState(false);
  const open = () => setPreviewModalOpened(true);
  const close = () => setPreviewModalOpened(false);

  if (previewRequired.includes(questionType)) {
    return (
      <>
        <Button
          onClick={open}
          disabled={response === "" || !response}
          className="flex gap-4 items-center"
        >
          <Eye className="size-4" />
          {translations("Preview")}
        </Button>
        <Dialog
          open={previewModalOpened}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) close();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                {translations("Preview")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <img
                className="rounded-lg object-cover"
                src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${response}`}
                alt={translations("Preview")}
              />
              <Button onClick={close}>{translations("Close")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  } else if (questionType === QuestionType.DocumentPicker) {
    return (
      <div className="p-2.5 min-w-50">
        {response && (
          <a
            href={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${response}`}
            download
            className="text-primary hover:underline"
          >
            Download
          </a>
        )}
      </div>
    );
  } else if (badgeRequired.includes(questionType)) {
    return (
      <Badge
        className="text-lg min-w-25 text-background"
        variant="secondary"
        style={{
          backgroundColor: getResponseArrayByQuestionType(questionType)?.find(
            (res) => res.value === response,
          )?.color,
        }}
      >
        {response}
      </Badge>
    );
  } else if (questionType == QuestionType.Testimonial) {
    return (
      <div className="flex flex-col gap-2">
        {response?.photo ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-light text-md text-gray-700 dark:text-gray-300">
                {translations("Profile Picture:")}{" "}
              </span>
              <Button className="w-fit" onClick={open} size="sm" variant="outline">
                <Eye className="mr-1.5 size-3.5" />
                {translations("Preview")}
              </Button>
            </div>
            <Dialog
              open={previewModalOpened}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) close();
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-xl font-extrabold">
                    {translations("Preview")}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <img
                    className="rounded-lg object-cover"
                    src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${response?.photo}`}
                    alt={translations("Preview")}
                  />
                  <Button onClick={close}>{translations("Close")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
        <HoverCardComponent content={response?.content} questionType={questionType} />
      </div>
    );
  } else if (questionType == QuestionType.File) {
    return response ? (
      <div className="flex gap-2 items-center">
        <span className="font-light text-md text-gray-700 dark:text-gray-300 w-37.5 break-words">
          {getFileNameFromKey(response)}
        </span>
        <Button
          onClick={() => {
            window.open(getFileUrlFromKey(response), "_blank");
          }}
          size="sm"
          className="h-7 px-2"
        >
          <Eye className="mr-1 size-3.5" />
          {translations("Preview")}
        </Button>
      </div>
    ) : null;
  } else {
    return <HoverCardComponent content={response} questionType={questionType} />;
  }
}

export function ActionMenu({
  resId,
  resTeamId,
  resSurveyTeamMapId,
  open,
  setSelectedResponseId,
  setResponseTeamId,
  setSelectedRowId,
  setSelectedRowSurveyTeamMapId,
  ticketData,
  enableTicket,
}: Readonly<{
  resId?: string;
  resTeamId?: string;
  resSurveyTeamMapId?: string;
  surveyId?: string;
  open?: () => void;
  setSelectedResponseId?: (id: string) => void;
  setResponseTeamId?: (id: string) => void;
  setSelectedRowId?: (id: string) => void;
  setSelectedRowSurveyTeamMapId?: (id: string) => void;
  ticketData?: Array<{ id: string }>;
  enableTicket?: boolean;
}>) {
  const ticketExist = (ticketData?.length ?? 0) > 0;
  const { t: translations } = useTranslation();

  return (
    <div className="px-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="rounded-lg text-xs text-gray-500 max-w-fit -ml-3.5"
              size="sm"
            />
          }
        >
          {translations("Select Action")}
          <ChevronDown className="ml-2 h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {enableTicket && (
            <DropdownMenuItem
              className={ticketExist ? "text-orange-500" : "text-blue-700"}
              onClick={() => {
                if (ticketExist) {
                  const url = `/dashboard/tickets/${ticketData?.[0]?.id}`;
                  window.open(url, "_blank");
                } else {
                  setSelectedResponseId?.(resId ?? "");
                  setResponseTeamId?.(resTeamId ?? "");
                }
              }}
            >
              <Ticket className="size-4" />
              {ticketExist ? translations("View Ticket") : translations("Create Ticket")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-red-500"
            onClick={() => {
              setSelectedRowId?.(resId ?? "");
              setSelectedRowSurveyTeamMapId?.(resSurveyTeamMapId ?? "");
              open?.();
            }}
          >
            <Trash2 className="size-4" />
            {translations("Delete Response")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
