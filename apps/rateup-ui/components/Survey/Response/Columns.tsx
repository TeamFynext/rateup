"use client";

import { useContext, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconChevronDown,
  IconEye,
  IconTicket,
  IconTrashXFilled,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import SurveyContext from "@/context/SurveyContext";

import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType } from "../../../types/enums";
import {
  getFileNameFromKey,
  getFileUrlFromKey,
} from "../../../utils/file-upload/upload";
import {
  getResponse,
  getResponseArrayByQuestionType,
} from "../../../utils/response";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import PreviewModal from "../../Modal/PreviewModal";
import { HoverCardComponent } from "../HoverCard/HoverCard";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";
import { fuzzyFilter } from "./Filter";

export const useSurveyResponseColumns = ({
  questions = [],
  defaultLanguage,
  setSelectedRowId,
  open,
  setSelectedResponseId,
  setResponseTeamId,
  enableTicket,
  surveyId,
  typeWa = false,
}: any) => {
  const translations = useTranslations();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const column: ColumnDef<any>[] = useMemo(
    () => [
      {
        header: () => (
          <span className="truncate font-semibold text-lg min-w-[200px] max-w-[200px] block">
            {translations("Created At")}
          </span>
        ),
        filterFn: fuzzyFilter,
        accessorKey: "createdAt",
        cell: (info) => (
          <div className="p-2.5 min-w-[200px]">
            {dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A")}
          </div>
        ),
      },
      ...(questions?.length > 0
        ? questions?.map((q: any) => {
          const content =
            getReplacedTitleFromVariable({
              title:
                q?.title[
                selectedLanguage ? selectedLanguage : defaultLanguage
                ],
              surveyId,
            }) ||
            q?.title[selectedLanguage ? selectedLanguage : defaultLanguage] ||
            q?.description[
            selectedLanguage ? selectedLanguage : defaultLanguage
            ] ||
            q?.label?.[
            selectedLanguage ? selectedLanguage : defaultLanguage
            ] ||
            "";
          return {
            ...(![
              QuestionType.Rating,
              QuestionType.Opinion,
              QuestionType.Number,
            ].includes(q?.type) && {
              filterFn: fuzzyFilter,
            }),
            accessorFn: (row: any) => {
              const response = row.responses
                ?.filter((item: any) => item?.questionId === q.id)
                ?.find((item: any) => item?.type === q.type)?.response[q.type];
              if (
                [
                  QuestionType.Rating,
                  QuestionType.Opinion,
                  QuestionType.Number,
                ].includes(q.type)
              ) {
                return Number(response);
              }

              return response;
            },
            id: content + "_,_" + q.type + "_,_" + q.id,
            header: () => (
              <HoverCardComponent content={content} fw={600} fz={"lg"} />
            ),
            enableColumnFilter: ![
              QuestionType.DocumentPicker,
              QuestionType.PhotoPicker,
              QuestionType.Photo,
              QuestionType.PCQ,
            ].includes(q.type),
            enableSorting: ![
              QuestionType.Photo,
              QuestionType.PCQ,
              QuestionType.DocumentPicker,
              QuestionType.PhotoPicker,
            ].includes(q.type),
            cell: (info) => {
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
        header: () => (
          <span className="truncate font-semibold text-lg min-w-[200px] max-w-[200px] block">
            {translations("Tags")}
          </span>
        ),
        accessorKey: "tag",
        cell: (info) => (
          <div className="p-2.5 min-w-[200px]">
            {info.getValue() as string}
          </div>
        ),
      },
      ...(typeWa
        ? [
          {
            header: () => (
              <span className="truncate font-semibold text-lg min-w-[200px] max-w-[200px] block">
                Respondent&apos;s Mobile Number
              </span>
            ),
            filterFn: fuzzyFilter,
            accessorFn: (row: any) => row?.phone,
            id: "respondentsMobileNumber",
            cell: (info) => (
              <div className="p-2.5 min-w-[200px]">
                {info.getValue()?.toString()}
              </div>
            ),
          },
        ]
        : []),
      ...(enableTicket
        ? [
          {
            header: () => (
              <span className="truncate font-semibold text-lg min-w-[70px] max-w-[70px] block">
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
                            <IconTicket
                              color="orange"
                              className="w-9 h-9"
                            />
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
        header: () => (
          <span className="truncate font-semibold text-lg min-w-[200px] max-w-[200px] block">
            Action
          </span>
        ),
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
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
          );
        },
        accessorKey: "action",
      },
    ],
    [questions, translations, enableTicket, selectedLanguage, surveyId, defaultLanguage, typeWa, open, setSelectedResponseId, setResponseTeamId, setSelectedRowId],
  );
  return column;
};

const previewRequired = [QuestionType.Photo, QuestionType.PhotoPicker];
const badgeRequired = [
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
  questionType: QuestionType;
  response: any;
}>) {
  const translations = useTranslations();
  const [previewModalOpened, setPreviewModalOpened] = useState(false);
  const open = () => setPreviewModalOpened(true);
  const close = () => setPreviewModalOpened(false);

  if (previewRequired.includes(questionType)) {
    return (
      <>
        <RateupButtonBlue
          title={translations("Preview")}
          leftIcon={<IconEye />}
          size="compact-xs"
          onClick={open}
          disabled={response === "" || !response}
        />
        <PreviewModal
          headerTitle={translations("Preview")}
          onClose={close}
          imgObject={response}
          opened={previewModalOpened}
        />
      </>
    );
  } else if (questionType === QuestionType.DocumentPicker) {
    return (
      <div className="p-2.5 min-w-[200px]">
        {response && (
          <a
            href={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`}
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
        className="text-lg font-semibold rounded-[10px] min-w-[100px]"
        variant="secondary"
        style={{
          backgroundColor:
            getResponseArrayByQuestionType(questionType)?.find(
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
              <Button
                className="w-fit"
                onClick={open}
                size="sm"
                variant="outline"
              >
                <IconEye className="mr-2 h-4 w-4" />
                {translations("Preview")}
              </Button>
            </div>
            <PreviewModal
              headerTitle={translations("Preview")}
              onClose={close}
              imgObject={response?.photo}
              opened={previewModalOpened}
            />
          </>
        ) : null}
        <HoverCardComponent
          content={response?.content}
          questionType={questionType}
        />
      </div>
    );
  } else if (questionType == QuestionType.File) {
    return response ? (
      <div className="flex gap-2 items-center">
        <span
          className="font-light text-md text-gray-700 dark:text-gray-300 w-[150px] break-words"
        >
          {getFileNameFromKey(response)}
        </span>
        <RateupButtonBlue
          onClick={() => {
            window.open(getFileUrlFromKey(response), "_blank");
          }}
          title={translations("Preview")}
          leftIcon={<IconEye size={"1rem"} />}
          size="compact-xs"
        />
      </div>
    ) : null;
  } else {
    return (
      <HoverCardComponent content={response} questionType={questionType} />
    );
  }
}

export function ActionMenu({
  resId,
  resTeamId,
  open,
  setSelectedResponseId,
  setResponseTeamId,
  setSelectedRowId,
  ticketData,
  enableTicket,
}: any) {
  const ticketExist = ticketData?.length > 0;
  const translations = useTranslations();
  return (
    <div className="px-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="rounded-lg text-xs text-gray-500 max-w-fit -ml-3.5"
            size="sm"
          >
            {translations("Select Action")}
            <IconChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {enableTicket && (
            <DropdownMenuItem
              className={ticketExist ? "text-orange-500" : "text-blue-700"}
              onClick={() => {
                if (ticketExist) {
                  let url = `/dashboard/tickets/${ticketData[0]?.id}`;
                  window.open(url, "_blank");
                } else {
                  setSelectedResponseId(resId);
                  setResponseTeamId(resTeamId);
                }
              }}
            >
              <IconTicket className="mr-2 h-3.5 w-3.5" />
              {ticketExist
                ? translations("View Ticket")
                : translations("Create Ticket")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-red-500"
            onClick={() => {
              setSelectedRowId(resId);
              open();
            }}
          >
            <IconTrashXFilled className="mr-2 h-3.5 w-3.5" />
            {translations("Delete Response")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
