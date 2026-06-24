import {
  Button,
  Group,
  Rating,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { QuestionType as Q, QuestionType, SmileyResponse } from "@/types/enums.ts";

import { RateupButtonBlue, RateupButtonSecondary } from "../../Button/RateupButtons.tsx";
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

  const updateTicketIssue = (ticketIssue: {
    minRating?: number;
    minOpinion?: number;
    reqOptions?: Array<string>;
    submissionTicket?: boolean;
    selectedColumnId?: string;
    selectedBoardId?: string;
  }) => {
    selectedQ &&
      setSelectedQ({
        ...selectedQ,
        ticketIssue: { ...selectedQ.ticketIssue, ...ticketIssue },
      });
  };

  useEffect(() => {
    if (selectedQ?.hasOwnProperty("ticketIssue") && selectedQ?.ticketIssue !== null) {
      setEnableTicketIssue(true);
      switch (selectedQ?.type) {
        case Q.Rating:
          minRating !== selectedQ["ticketIssue"]["minRating"] &&
            setMinRating(selectedQ["ticketIssue"]["minRating"]);
          break;
        case Q.Opinion:
          minOpinion !== selectedQ["ticketIssue"]["minOpinion"] &&
            setMinOpinion(selectedQ["ticketIssue"]["minOpinion"]);
          break;
        case Q.Smiley:
          selectedOptions !== selectedQ["ticketIssue"]["reqOptions"] &&
            setSelectedOptions(selectedQ["ticketIssue"]["reqOptions"]);
          break;
      }
      if (selectedQ["ticketIssue"]["submissionTicket"])
        setSubmissionTicket(selectedQ["ticketIssue"]["submissionTicket"]);
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

  const handleSwitch = (event: any) => {
    const isChecked = event.currentTarget.checked;
    setEnableTicketIssue(isChecked);
    if (isChecked) {
      toast.error(translations("Enter condition for ticket issue"), {
        id: "load-data",
      });
    }
  };

  const updateSmileyResponse = (value) => {
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

  const handleError = (error) => {
    console.error("Failed to update", error);
    toast.error(` ${translations("Failed to update.. try again. Error:")} ${error.message}`, {
      id: "load-data",
    });
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

  const { primaryColor } = useMantineTheme();
  if (isPending) return <RateupLoader h={100} />;

  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <Title order={3}>Automated Ticket Creation</Title>
      <Stack px="lg" h="100%">
        <>
          <Switch
            label={translations("Enable Auto-Ticket Creation")}
            description={translations("Setup automated ticket creation for negative responses.")}
            labelPosition="left"
            checked={enableTicketIssue}
            onChange={(event) => handleSwitch(event)}
            size="lg"
            styles={{
              body: {
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              },
            }}
          />

          {enableTicketIssue && (
            <>
              <Stack>
                <Switch
                  label={translations("Raise Ticket if Response submitted")}
                  checked={submissionTicket}
                  onChange={(e) => setSubmissionTicket(e.currentTarget.checked)}
                  styles={{
                    label: {
                      fontWeight: 500,
                      fontSize: 16,
                    },
                  }}
                />
                <Group>
                  {(() => {
                    switch (selectedQ?.type) {
                      case Q.Smiley:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {translations(
                                "Select the emojis for which Ticket creation to be enabled:",
                              )}
                            </Text>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {" "}
                              :{" "}
                            </Text>
                            <Group style={{ minWidth: "300px" }}>
                              {Object.values(SmileyResponse).map((value) => (
                                <Button
                                  key={value}
                                  title={value}
                                  variant={selectedOptions.includes(value) ? "light" : "default"}
                                  gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
                                  onClick={() => updateSmileyResponse(value)}
                                  style={{
                                    minHeight: "20px",
                                    maxWidth: "70px",
                                  }}
                                  disabled={submissionTicket}
                                >
                                  {mapSmileyIcon(
                                    value,
                                    submissionTicket ? "var(--gift-grey-2)" : primaryColor,
                                  )}
                                </Button>
                              ))}
                            </Group>
                          </SimpleGrid>
                        );
                      case Q.Rating:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {translations("Select rating until which Ticket should be created:")}
                            </Text>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {" "}
                              :{" "}
                            </Text>
                            <Stack align="center">
                              <Rating
                                value={minRating}
                                onChange={setMinRating}
                                size="xl"
                                color={submissionTicket ? "var(--gift-grey-2)" : "yellow"}
                                readOnly={submissionTicket}
                              />
                              <Text c={submissionTicket ? "dimmed" : "black"}>
                                {" "}
                                {minRating} star and below.
                              </Text>
                            </Stack>
                          </SimpleGrid>
                        );
                      case Q.Opinion:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {" "}
                              {translations(
                                "Select scale until which Ticket should be created:",
                              )}{" "}
                            </Text>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {" "}
                              :{" "}
                            </Text>
                            <Stack>
                              <Group style={{ minWidth: "300px" }}>
                                {(() => {
                                  const buttons = [];
                                  for (let i = 1; i <= 10; i++) {
                                    buttons.push(
                                      <Button
                                        key={i}
                                        radius="xl"
                                        size="xs"
                                        onClick={() => setMinOpinion(i)}
                                        color={minOpinion === i ? "blue" : "blue.9"}
                                        variant={minOpinion === i ? "gradient" : "default"}
                                        gradient={{
                                          from: "#62CBE6",
                                          to: "#3F5BA9",
                                        }}
                                        disabled={submissionTicket}
                                      >
                                        {i}
                                      </Button>,
                                    );
                                  }
                                  return buttons;
                                })()}
                              </Group>
                              <Text pt="sm" fz="sm" c="dimmed">
                                {" "}
                                {translations("For")} {minOpinion} {translations("and below.")}
                              </Text>
                            </Stack>
                          </SimpleGrid>
                        );
                      case QuestionType.CustomNPS:
                      case QuestionType.DDMS:
                      case QuestionType.DDSS:
                      case QuestionType.MCQ:
                      case QuestionType.MSQ:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {translations("Select choices for which Ticket should be created")}:
                            </Text>
                            <Text fw={500} c={submissionTicket ? "dimmed" : "black"}>
                              {" "}
                              :{" "}
                            </Text>
                            <Stack>
                              <ContainedMultiSelect
                                data={selectedQ.choices?.[selectedLanguage].map((c, index) => ({
                                  value: index.toString(),
                                  label: c.value as string,
                                }))}
                                value={selectedOptions}
                                onChange={setSelectedOptions}
                                placeholder="select"
                                disabled={submissionTicket}
                              />
                            </Stack>
                          </SimpleGrid>
                        );
                      default:
                        return null;
                    }
                  })()}
                </Group>
              </Stack>
              <Stack gap="xs">
                <Select
                  label="Select Board"
                  placeholder="Choose a board"
                  value={selectedQ?.ticketIssue?.selectedBoardId}
                  data={boards}
                  onChange={(boardId) => {
                    setSelectedBoardId(boardId);
                    setSelectedQ({
                      ...selectedQ,
                      ticketIssue: {
                        ...selectedQ.ticketIssue,
                        selectedBoardId: boardId,
                      },
                    });
                  }}
                />
                {selectedBoardId && (
                  <Select
                    label="Select Column"
                    placeholder="Choose a column"
                    value={selectedQ?.ticketIssue?.selectedColumnId}
                    data={columns}
                    onChange={(columnId) => {
                      setSelectedQ({
                        ...selectedQ,
                        ticketIssue: {
                          ...selectedQ.ticketIssue,
                          selectedColumnId: columnId,
                        },
                      });
                    }}
                  />
                )}
              </Stack>
            </>
          )}
        </>
      </Stack>
      <Group justify="space-between">
        <RateupButtonSecondary
          title={translations("Cancel")}
          size="md"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
        <RateupButtonBlue
          title={translations("Save")}
          size="md"
          onClick={handleSave}
          loading={questionUpdateMutation.isPending}
        />
      </Group>
    </Stack>
  );
};

export default TicketIssueEditor;
