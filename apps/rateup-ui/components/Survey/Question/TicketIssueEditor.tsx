import React, { useState, useEffect } from "react";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  Rating,
  Group,
  Title,
  Stack,
  Switch,
  Text,
  SimpleGrid,
  Button,
  useMantineTheme,
} from "@mantine/core";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { QuestionType as Q, SmileyResponse } from "../../../types/enums";
import { useQuestionUpdateMutation } from "../../../backend/surveys/questions/questions.query";
import { useRouter } from "next/router";
import { mapSmileyIcon } from "../TakeSurvey/TakeSurveyComponent/SmileyRating";
import { useSurvey } from "../../../backend/surveys/surveys.query";
interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyId?: string;
}

const TicketIssueEditor = ({
  selectedQ,
  setSelectedQ,
  setActiveTab,
  surveyId,
}: IProps) => {
  surveyId = surveyId || (useRouter().query.surveyId as string);
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const [enableTicketIssue, setEnableTicketIssue] = useState(
    !!selectedQ?.ticketIssue,
  );

  const [minRating, setMinRating] = useState(
    selectedQ?.ticketIssue?.minRating || 3,
  );
  const [minOpinion, setMinOpinion] = useState(
    selectedQ?.ticketIssue?.minOpinion || 6,
  );
  const [selectedSmileys, setSelectedSmileys] = useState(
    selectedQ?.ticketIssue?.reqOptions || ["Sad", "Very Sad"],
  );

  const updateTicketIssue = (ticketIssue: any) => {
    selectedQ && setSelectedQ({ ...selectedQ, ticketIssue });
  };

  useEffect(() => {
    if (
      selectedQ?.hasOwnProperty("ticketIssue") &&
      selectedQ?.ticketIssue !== null
    ) {
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
          selectedSmileys !== selectedQ["ticketIssue"]["reqOptions"] &&
            setSelectedSmileys(selectedQ["ticketIssue"]["reqOptions"]);
          break;
      }
    } else {
      setEnableTicketIssue(false);
    }
  }, [selectedQ]);

  useEffect(() => {
    let ticketIssue = null;
    if (enableTicketIssue) {
      switch (selectedQ?.type) {
        case Q.Rating:
          ticketIssue = { minRating: minRating };
          break;
        case Q.Opinion:
          ticketIssue = { minOpinion: minOpinion };
          break;
        case Q.Smiley:
          ticketIssue = { reqOptions: selectedSmileys };
          break;
      }
    }
    updateTicketIssue(ticketIssue);
  }, [enableTicketIssue, minRating, minOpinion, selectedSmileys]);

  const handleSwitch = (event: any) => {
    const isChecked = event.currentTarget.checked;
    setEnableTicketIssue(isChecked);
    if (isChecked) {
      notifications.show({
        id: "load-data",
        color: "var(--color-tertiary)",
        title: "Configure Ticket Issue",
        message: "Enter condition for ticket issue",
        icon: <IconInfoCircle size="3rem" />,
        autoClose: 3000,
      });
    }
  };

  const updateSmileyResponse = (value) => {
    setSelectedSmileys((prevSmileys) => {
      return prevSmileys.includes(value)
        ? prevSmileys.filter((smiley) => smiley !== value)
        : [...prevSmileys, value];
    });
  };

  const handleSave = async () => {
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Enabling automatic ticket issue",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      finishQuestionOptionsUpdate();
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error) => {
    console.error("Failed to update", error);
    notifications.show({
      id: "load-data",
      color: "red",
      title: "Failed",
      message: `Failed to update.. try again. Error: ${error.message}`,
      icon: <IconX size="1rem" />,
      autoClose: 2000,
    });
  };

  const finishQuestionOptionsUpdate = () => {
    questionUpdateMutation.mutate(
      {
        qId: selectedQ.id,
        data: { ticketIssue: selectedQ?.ticketIssue },
      },
      {
        onError: (error) => {
          notifications.update({
            id: "load-data",
            loading: false,
            title: "Failed",
            message: `Error updating Ticket issue settings`,
            autoClose: true,
            withCloseButton: true,
          });
        },
        onSuccess: () => {
          notifications.update({
            id: "load-data",
            loading: false,
            title: "Success",
            message: `Updated Ticket issue settings Successfully`,
            autoClose: true,
            withCloseButton: true,
          });
        },
      },
    );

    setActiveTab(QuestionTabsEnum.Edit);
  };

  const { primaryColor } = useMantineTheme();
  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <Title order={3}>Automated Ticket Creation</Title>
      <Stack px="lg" h="100%">
        <>
          <Switch
            label="Enable Auto-Ticket Creation"
            description="Setup automated ticket creation for negative responses."
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
                <Group>
                  {(() => {
                    switch (selectedQ?.type) {
                      case Q.Smiley:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500}>
                              Select the emojis for which Ticket creation to be
                              enabled:
                            </Text>
                            <Text fw={500}> : </Text>
                            <Group style={{ minWidth: "300px" }}>
                              {Object.values(SmileyResponse).map((value) => (
                                <Button
                                  key={value}
                                  title={value}
                                  variant={
                                    selectedSmileys.includes(value)
                                      ? "light"
                                      : "default"
                                  }
                                  gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
                                  onClick={() => updateSmileyResponse(value)}
                                  style={{
                                    minHeight: "20px",
                                    maxWidth: "70px",
                                  }}
                                >
                                  {mapSmileyIcon(value, primaryColor)}
                                </Button>
                              ))}
                            </Group>
                          </SimpleGrid>
                        );
                      case Q.Rating:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500}>
                              Select rating until which Ticket should be
                              created:
                            </Text>
                            <Text fw={500}> : </Text>
                            <Stack align="center">
                              <Rating
                                value={minRating}
                                onChange={setMinRating}
                                size="xl"
                              />
                              <Text> {minRating} star and below.</Text>
                            </Stack>
                          </SimpleGrid>
                        );
                      case Q.Opinion:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500}>
                              {" "}
                              Select scale until which Ticket should be created:{" "}
                            </Text>
                            <Text fw={500}> : </Text>
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
                                        color={
                                          minOpinion === i ? "blue" : "blue.9"
                                        }
                                        variant={
                                          minOpinion === i
                                            ? "gradient"
                                            : "default"
                                        }
                                        gradient={{
                                          from: "#62CBE6",
                                          to: "#3F5BA9",
                                        }}
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
                                For {minOpinion} and below.
                              </Text>
                            </Stack>
                          </SimpleGrid>
                        );
                      default:
                        return null;
                    }
                  })()}
                </Group>
              </Stack>
            </>
          )}
        </>
      </Stack>

      <Group justify="space-between">
        <RateupButtonSecondary
          title={"Cancel"}
          size="md"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
        <RateupButtonBlue
          title={"Save"}
          size="md"
          onClick={handleSave}
          loading={questionUpdateMutation.isPending}
        />
      </Group>
    </Stack>
  );
};

export default TicketIssueEditor;
