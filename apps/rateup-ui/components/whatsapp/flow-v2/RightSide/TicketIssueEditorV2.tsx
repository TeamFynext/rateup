import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Button,
  Group,
  Rating,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";

import { QuestionType2, SmileyResponse, SmileyResponse2 } from "@/types/enums";
import { useUpdateFlowMutation } from "@/backend/whatsapp/flow/flow.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import { QuestionTabsEnum } from "@/components/Survey/EditSurvey";
import { mapSmileyIcon } from "@/components/Survey/TakeSurvey/TakeSurveyComponent/SmileyRating";
import useTranslations from "@/dictionaries/useTranslation";

import { EditorType } from "../utils/store";

const TicketIssueEditorV2 = ({
  element,
  ticketIssued,
  setDetailActiveEditor,
}) => {
  const router = useRouter();
  const { dbFlowId } = router.query as { dbFlowId: string };
  const { translations } = useTranslations();
  const ticketIssue = ticketIssued.find((s) => s.questionId === element.id);
  const [enableTicketIssue, setEnableTicketIssue] = useState(!!ticketIssue);
  const updateFlow = useUpdateFlowMutation();

  const [selectedSmileys, setSelectedSmileys] = useListState(
    ticketIssue?.condition?.reqOptions ?? [],
  );
  const [minRating, setMinRating] = useState(ticketIssue?.condition?.minRating);
  const [minOpinion, setMinOpinion] = useState(
    ticketIssue?.condition?.minOpinion ?? "3",
  );

  const handleSwitch = (event: any) => {
    const isChecked = event.currentTarget.checked;
    setEnableTicketIssue(isChecked);
    if (isChecked) {
      notifications.show({
        id: "load-data",
        color: "var(--color-tertiary)",
        title: translations["Configure Ticket Issue"],
        message: translations["Enter condition for ticket issue"],
        icon: <IconInfoCircle size="3rem" />,
        autoClose: 3000,
      });
    }
  };

  function getTicketCondition(type: QuestionType2) {
    switch (type) {
      case QuestionType2.Rating:
        return { minRating };
      case QuestionType2.Smiley:
        return { reqOptions: selectedSmileys };
      case QuestionType2.Opinion:
        return { minOpinion: Number(minOpinion) };
    }
  }

  const handleSave = () => {
    const currentElementType = QuestionType2[element.metaType];
    console.log("currentElementType", currentElementType);
    if (ticketIssue && !enableTicketIssue) {
      const updatedTickets = ticketIssued.filter(
        (t) => t.questionId !== element.id,
      );
      updateFlow.mutate({ dbFlowId, data: { ticketIssued: updatedTickets } });
    } else {
      let updatedTickets = [...ticketIssued];
      if (ticketIssue)
        updatedTickets = ticketIssued.map((t) =>
          t.questionId === element.id
            ? { ...t, condition: getTicketCondition(currentElementType) }
            : t,
        );
      else
        updatedTickets.push({
          questionId: element.id,
          type: currentElementType,
          condition: getTicketCondition(currentElementType),
        });
      updateFlow.mutate({ dbFlowId, data: { ticketIssued: updatedTickets } });
    }
  };

  useEffect(() => {
    setEnableTicketIssue(!!ticketIssue);
  }, [ticketIssue]);

  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <Title order={3}>Automated Ticket Creation</Title>
      <Stack px="lg" h="100%">
        <>
          <Switch
            label={translations["Enable Auto-Ticket Creation"]}
            description={
              translations[
                "Setup automated ticket creation for negative responses."
              ]
            }
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
                    switch (QuestionType2[element?.metaType]) {
                      case QuestionType2.Smiley:
                        return (
                          <SimpleGrid cols={2} spacing={30}>
                            <Text fw={500}>
                              {
                                translations[
                                  "Select the emojis for which Ticket creation to be enabled:"
                                ]
                              }
                            </Text>
                            <Group style={{ minWidth: "300px" }}>
                              {Object.values(SmileyResponse2).map(
                                (value, index) => (
                                  <ActionIcon
                                    variant={
                                      selectedSmileys.includes(
                                        (index + 1).toString(),
                                      )
                                        ? "gradient"
                                        : "subtle"
                                    }
                                    size={"xl"}
                                    key={value}
                                    onClick={() =>
                                      selectedSmileys.includes(
                                        (index + 1).toString(),
                                      )
                                        ? setSelectedSmileys.setState(
                                            selectedSmileys.filter(
                                              (s) =>
                                                s !== (index + 1).toString(),
                                            ),
                                          )
                                        : setSelectedSmileys.append(
                                            (index + 1).toString(),
                                          )
                                    }
                                  >
                                    <Text fz={30}>{value}</Text>
                                  </ActionIcon>
                                  // <Button
                                  //   key={value}
                                  //   size={
                                  //     selectedSmileys.includes(value)
                                  //       ? "sm"
                                  //       : "xs"
                                  //   }
                                  //   onClick={() => {
                                  //      selectedSmileys.includes(value)?
                                  //    setSelectedSmileys(prev => {
                                  //     const [value,...rest] = prev
                                  //     return rest
                                  //    }):
                                  //    setSelectedSmileys(prev =>[...prev, value])
                                  //   }}
                                  // >
                                  //  {value}
                                  // </Button>
                                ),
                              )}
                            </Group>
                          </SimpleGrid>
                        );
                      case QuestionType2.Rating:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500}>
                              {
                                translations[
                                  "Select rating until which Ticket should be created:"
                                ]
                              }
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
                      case QuestionType2.Opinion:
                        return (
                          <SimpleGrid cols={3} spacing={30}>
                            <Text fw={500}>
                              {" "}
                              {
                                translations[
                                  "Select scale until which Ticket should be created:"
                                ]
                              }{" "}
                            </Text>
                            <Text fw={500}> : </Text>
                            <Stack>
                              <ContainedSelection
                                data={Array.from({ length: 10 }, (_, i) =>
                                  (i + 1).toString(),
                                )}
                                value={minOpinion?.toString()}
                                onChange={setMinOpinion}
                              />
                              {/* <Group style={{ minWidth: "300px" }}>
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
                              </Group> */}
                              <Text pt="sm" fz="sm" c="dimmed">
                                {" "}
                                {translations["For"]} {minOpinion}{" "}
                                {translations["and below."]}
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
          title={translations["Cancel"]}
          size="md"
          onClick={() => setDetailActiveEditor(EditorType.ElementEditor)}
        />
        <RateupButtonBlue
          title={translations["Save"]}
          size="md"
          onClick={handleSave}
          loading={false}
        />
      </Group>
    </Stack>
  );
};

export default TicketIssueEditorV2;
