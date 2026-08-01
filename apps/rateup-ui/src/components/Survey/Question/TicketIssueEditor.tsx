import { IconStar } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils";
import { QuestionType as Q, QuestionType, SmileyResponse } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { QuestionTabsEnum } from "../EditSurvey.tsx";
import { mapSmileyIcon } from "../TakeSurvey/TakeSurveyComponent/SmileyRating/index.tsx";

interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyId?: string;
}

const TicketIssueEditor = ({ selectedQ, setSelectedQ, setActiveTab, surveyId }: IProps) => {
  const params = useParams({
    strict: false,
  });
  surveyId = surveyId || (params.surveyId as string);
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });
  const { data: options, isPending } = useBoardsQueries();
  const [selectedBoardId, setSelectedBoardId] = useState(selectedQ?.ticketIssue?.selectedBoardId);
  const [hoveredRating, setHoveredRating] = useState(-1);

  // Transform boards for Select component
  const boards = useMemo(
    () => options?.map((board) => ({ value: board.id, label: board.title })),
    [options],
  );

  // Get columns for selected board
  const columns = useMemo(() => {
    const selectedBoard = options?.find((board) => board.id === selectedBoardId);
    return selectedBoard
      ? selectedBoard.ticketColumns.map((col) => ({
          value: col.id,
          label: col.title,
        }))
      : [];
  }, [options, selectedBoardId]);

  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const [enableTicketIssue, setEnableTicketIssue] = useState(!!selectedQ?.ticketIssue);
  const [submissionTicket, setSubmissionTicket] = useState(
    !!selectedQ?.ticketIssue?.submissionTicket,
  );
  const { t: translations } = useTranslation();
  const [minRating, setMinRating] = useState(selectedQ?.ticketIssue?.minRating || 3);
  const [minOpinion, setMinOpinion] = useState(selectedQ?.ticketIssue?.minOpinion || 6);
  const [selectedOptions, setSelectedOptions] = useState(selectedQ?.ticketIssue?.reqOptions || []);

  const updateTicketIssue = (
    ticketIssue: {
      minRating?: number;
      minOpinion?: number;
      reqOptions?: Array<string>;
      submissionTicket?: boolean;
      selectedColumnId?: string;
      selectedBoardId?: string;
    } | null,
  ) => {
    if (selectedQ) {
      setSelectedQ({
        ...selectedQ,
        ticketIssue: { ...selectedQ.ticketIssue, ...ticketIssue },
      });
    }
  };

  useEffect(() => {
    if (selectedQ?.hasOwnProperty("ticketIssue") && selectedQ?.ticketIssue !== null) {
      setEnableTicketIssue(true);
      switch (selectedQ?.type) {
        case Q.Rating:
          if (minRating !== selectedQ["ticketIssue"]!["minRating"]!) {
            setMinRating(selectedQ["ticketIssue"]!["minRating"]!);
          }
          break;
        case Q.Opinion:
          if (minOpinion !== selectedQ["ticketIssue"]!["minOpinion"]!) {
            setMinOpinion(selectedQ["ticketIssue"]!["minOpinion"]!);
          }
          break;
        case Q.Smiley:
          if (selectedOptions !== selectedQ["ticketIssue"]!["reqOptions"]!) {
            setSelectedOptions(selectedQ["ticketIssue"]!["reqOptions"]!);
          }
          break;
      }
      if (selectedQ["ticketIssue"]!["submissionTicket"]!)
        setSubmissionTicket(selectedQ["ticketIssue"]!["submissionTicket"]!);
    } else {
      setEnableTicketIssue(false);
    }
  }, [selectedQ]);

  useEffect(() => {
    let ticketIssue = null;
    if (enableTicketIssue) {
      switch (selectedQ?.type) {
        case Q.Rating:
          ticketIssue = { minRating: minRating, submissionTicket };
          break;
        case Q.Opinion:
          ticketIssue = { minOpinion: minOpinion, submissionTicket };
          break;
        case Q.Smiley:
        case Q.CustomNPS:
        case Q.DDMS:
        case Q.MCQ:
        case Q.MSQ:
        case Q.DDSS:
          ticketIssue = { reqOptions: selectedOptions, submissionTicket };
          break;
        default:
          ticketIssue = { submissionTicket };
          break;
      }
    }
    updateTicketIssue(ticketIssue);
  }, [enableTicketIssue, minRating, minOpinion, selectedOptions, submissionTicket]);

  const handleSwitch = (isChecked: boolean) => {
    setEnableTicketIssue(isChecked);
    if (isChecked) {
      toast.error(translations("Enter condition for ticket issue"), {
        id: "load-data",
      });
    }
  };

  const updateSmileyResponse = (value: string) => {
    setSelectedOptions((prevSmileys) => {
      return prevSmileys.includes(value)
        ? prevSmileys.filter((smiley) => smiley !== value)
        : [...prevSmileys, value];
    });
  };

  const handleSave = async () => {
    toast.loading(translations("Hold on, your changes are getting updated.."), {
      id: "load-data",
    });

    try {
      finishQuestionOptionsUpdate();
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error: unknown) => {
    console.error("Failed to update", error);
    toast.error(
      ` ${translations("Failed to update.. try again. Error:")} ${getApiErrorMessage(error)}`,
      {
        id: "load-data",
      },
    );
  };

  const finishQuestionOptionsUpdate = () => {
    questionUpdateMutation.mutate(
      {
        qId: selectedQ.id,
        data: { ticketIssue: selectedQ?.ticketIssue },
      },
      {
        onError: (_error) => {
          toast.success(translations("Error updating Ticket issue settings"), {
            id: "load-data",
          });
        },
        onSuccess: () => {
          toast.success(translations("Updated Ticket issue settings Successfully"), {
            id: "load-data",
          });
        },
      },
    );

    setActiveTab(QuestionTabsEnum.Edit);
  };

  if (isPending) return <RateupLoader className="h-25" />;

  return (
    <div className="flex h-full flex-col justify-between">
      <h3 className="text-xl font-semibold">Automated Ticket Creation</h3>
      <div className="flex h-full flex-col gap-4 px-5">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {translations("Enable Auto-Ticket Creation")}
            </span>
            <span className="text-sm text-muted-foreground">
              {translations("Setup automated ticket creation for negative responses.")}
            </span>
          </div>
          <Switch checked={enableTicketIssue} onCheckedChange={handleSwitch} />
        </div>

        {enableTicketIssue && (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">
                  {translations("Raise Ticket if Response submitted")}
                </span>
                <Switch checked={submissionTicket} onCheckedChange={setSubmissionTicket} />
              </div>
              <div className="flex items-center gap-8">
                {(() => {
                  switch (selectedQ?.type) {
                    case Q.Smiley:
                      return (
                        <>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            {translations(
                              "Select the emojis for which Ticket creation to be enabled:",
                            )}
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            :
                          </span>
                          <div className="flex items-center gap-2">
                            {Object.values(SmileyResponse).map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant="ghost"
                                size="icon-lg"
                                onClick={() => updateSmileyResponse(value)}
                                disabled={submissionTicket}
                              >
                                {mapSmileyIcon(
                                  value,
                                  submissionTicket
                                    ? "gray"
                                    : selectedOptions.includes(value)
                                      ? "red"
                                      : "dark",
                                )}
                              </Button>
                            ))}
                          </div>
                        </>
                      );
                    case Q.Rating:
                      return (
                        <>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            {translations("Select rating until which Ticket should be created:")}
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            :
                          </span>
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => {
                                const starValue = i + 1;
                                const filled =
                                  hoveredRating !== -1
                                    ? starValue <= hoveredRating
                                    : starValue <= minRating;
                                return (
                                  <button
                                    key={starValue}
                                    type="button"
                                    disabled={submissionTicket}
                                    onClick={() => setMinRating(starValue)}
                                    onMouseEnter={() => setHoveredRating(starValue)}
                                    onMouseLeave={() => setHoveredRating(-1)}
                                    className="flex items-center justify-center p-0.5 disabled:cursor-not-allowed"
                                  >
                                    <IconStar
                                      className={cn(
                                        "size-6",
                                        submissionTicket
                                          ? "text-muted-foreground/50"
                                          : filled
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-muted-foreground",
                                      )}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <span className={cn(submissionTicket && "text-muted-foreground")}>
                              {minRating} star and below.
                            </span>
                          </div>
                        </>
                      );
                    case Q.Opinion:
                      return (
                        <>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            {translations("Select scale until which Ticket should be created:")}
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            :
                          </span>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
                                <Button
                                  key={i}
                                  type="button"
                                  size="sm"
                                  variant={minOpinion === i ? "default" : "outline"}
                                  className="rounded-full"
                                  onClick={() => setMinOpinion(i)}
                                  disabled={submissionTicket}
                                >
                                  {i}
                                </Button>
                              ))}
                            </div>
                            <span
                              className={cn(
                                "pt-3 text-sm text-muted-foreground",
                                submissionTicket && "text-muted-foreground/60",
                              )}
                            >
                              {translations("For")} {minOpinion} {translations("and below.")}
                            </span>
                          </div>
                        </>
                      );
                    case QuestionType.CustomNPS:
                    case QuestionType.DDMS:
                    case QuestionType.DDSS:
                    case QuestionType.MCQ:
                    case QuestionType.MSQ:
                      return (
                        <>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            {translations("Select choices for which Ticket should be created")}:
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              submissionTicket && "text-muted-foreground",
                            )}
                          >
                            :
                          </span>
                          <MultiSelect
                            options={selectedQ.choices?.[selectedLanguage].map(
                              (c: Choice, index: number) => ({
                                value: index.toString(),
                                label: c.value as string,
                              }),
                            )}
                            value={selectedOptions}
                            onValueChange={setSelectedOptions}
                            placeholder="select"
                            disabled={submissionTicket}
                          />
                        </>
                      );
                    default:
                      return null;
                  }
                })()}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Field>
                <FieldLabel htmlFor="ticket-board">Select Board</FieldLabel>
                <Select
                  value={selectedQ?.ticketIssue?.selectedBoardId ?? ""}
                  onValueChange={(boardId) => {
                    setSelectedBoardId(boardId ?? undefined);
                    setSelectedQ({
                      ...selectedQ,
                      ticketIssue: {
                        ...selectedQ.ticketIssue,
                        selectedBoardId: boardId ?? undefined,
                      },
                    });
                  }}
                  items={boards}
                >
                  <SelectTrigger id="ticket-board" className="w-full">
                    <SelectValue placeholder="Choose a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards?.map((board) => (
                      <SelectItem key={board.value} value={board.value}>
                        {board.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {selectedBoardId && (
                <Field>
                  <FieldLabel htmlFor="ticket-column">Select Column</FieldLabel>
                  <Select
                    value={selectedQ?.ticketIssue?.selectedColumnId ?? ""}
                    onValueChange={(columnId) => {
                      setSelectedQ({
                        ...selectedQ,
                        ticketIssue: {
                          ...selectedQ.ticketIssue,
                          selectedColumnId: columnId ?? undefined,
                        },
                      });
                    }}
                    items={columns}
                  >
                    <SelectTrigger id="ticket-column" className="w-full">
                      <SelectValue placeholder="Choose a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns?.map((column) => (
                        <SelectItem key={column.value} value={column.value}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
          {translations("Cancel")}
        </Button>
        <Button onClick={handleSave} disabled={questionUpdateMutation.isPending}>
          {questionUpdateMutation.isPending && <Spinner data-icon="inline-start" />}
          {translations("Save")}
        </Button>
      </div>
    </div>
  );
};

export default TicketIssueEditor;
