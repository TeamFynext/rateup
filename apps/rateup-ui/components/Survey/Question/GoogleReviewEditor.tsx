"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Button,
  Divider,
  Group,
  Rating,
  ScrollAreaAutosize,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import useFlowStore, {
  EditorType,
} from "@/components/whatsapp/flow-v2/utils/store";

import { useQuestionUpdateMutation } from "../../../backend/surveys/questions/questions.query";
import { useSurvey } from "../../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../../backend/team/team.query";
import { QuestionType as Q, SmileyResponse } from "../../../types/enums";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { QuestionTabsEnum } from "../EditSurvey";
import { mapSmileyIcon } from "../TakeSurvey/TakeSurveyComponent/SmileyRating";
import AddGoogleReviewLinkForTeamModal from "./AddGoogleReviewLinkForTeamModal";
import { ReviewPagePlatform } from "./QuestionReviewPageEditor";

interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<QuestionTabsEnum>>;
  surveyId?: string;
  waFlowSave?: boolean;
}

const GoogleReviewEditor = ({
  selectedQ,
  setSelectedQ,
  setActiveTab,
  surveyId,
  waFlowSave = false,
}: IProps) => {
  const params = useParams();
  surveyId = surveyId || (params.surveyId as string);

  const [linkUpdateStatus, setLinkUpdateStatus] = useState(false);
  const { data: survey } = useSurvey(surveyId);
  const { updateComponentInScreen, currentElementId, setDetailActiveEditor } =
    useFlowStore();

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const [enableGoogleReview, setEnableGoogleReview] = useState(
    !!selectedQ?.googleReview,
  );
  const [minRating, setMinRating] = useState(
    selectedQ?.googleReview?.minRating || 3,
  );
  const [minOpinion, setMinOpinion] = useState(
    selectedQ?.googleReview?.minOpinion || 6,
  );
  const [selectedSmileys, setSelectedSmileys] = useState(
    selectedQ?.googleReview?.reqOptions || ["VeryHappy", "Happy"],
  );

  const updateGoogleReview = (googleReview: any) => {
    selectedQ && setSelectedQ({ ...selectedQ, googleReview });
  };
  const translations = useTranslations();
  const switchCondition = waFlowSave ? selectedQ?.metaType : selectedQ?.type;
  useEffect(() => {
    if (
      selectedQ?.hasOwnProperty("googleReview") &&
      selectedQ?.googleReview !== null
    ) {
      setEnableGoogleReview(true);
      switch (selectedQ?.type) {
        case Q.Rating:
          minRating !== selectedQ["googleReview"]["minRating"] &&
            setMinRating(selectedQ["googleReview"]["minRating"]);
          break;
        case Q.Opinion:
          minOpinion !== selectedQ["googleReview"]["minOpinion"] &&
            setMinOpinion(selectedQ["googleReview"]["minOpinion"]);
          break;
        case Q.Smiley:
          selectedSmileys !== selectedQ["googleReview"]["reqOptions"] &&
            setSelectedSmileys(selectedQ["googleReview"]["reqOptions"]);
          break;
      }
    } else {
      setEnableGoogleReview(false);
    }
  }, [selectedQ]);

  useEffect(() => {
    let googleReview = null;
    if (enableGoogleReview) {
      switch (switchCondition) {
        case Q.Rating:
          googleReview = { minRating: minRating };
          break;
        case Q.Opinion:
          googleReview = { minOpinion: minOpinion };
          break;
        case Q.Smiley:
          googleReview = { reqOptions: selectedSmileys };
          break;
      }
    }
    updateGoogleReview(googleReview);
  }, [enableGoogleReview, minRating, minOpinion, selectedSmileys]);

  const handleSwitch = (event: any) => {
    const isChecked = event.currentTarget.checked;
    setEnableGoogleReview(isChecked);
    if (isChecked) {
      notifications.show({
        id: "load-data",
        color: "var(--color-tertiary)",
        title: translations("Configure Google Review"),
        message: translations("Enter condition and Google page URL"),
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

  const { data: teamsRes } = useTeamsByUser();
  const teamsToDisplay = teamsRes?.data?.filter((t) =>
    survey?.teams.some((st) => st.id === t.id),
  );

  const handleSave = async () => {
    if (teamsToDisplay.some((team) => !team.googleLink)) {
      notifications.show({
        color: "red",
        title: "Failed",
        message: translations("Please enter Google Review links for all teams"),
        icon: <IconX size="1rem" />,
        autoClose: 2000,
      });
      return;
    }
    if (!waFlowSave)
      notifications.show({
        id: "load-data",
        loading: true,
        title: translations("Enabling google review"),
        message: translations("Hold on, your changes are getting updated"),
        autoClose: false,
        withCloseButton: false,
      });

    try {
      setLinkUpdateStatus(true);
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error) => {
    console.error("Failed to update", error);
    notifications.show({
      id: "load-data",
      color: "red",
      title: translations("Failed"),
      message: `${translations("Failed to update try again Error:")} ${error.message}`,
      icon: <IconX size="1rem" />,
      autoClose: 2000,
    });
  };

  useEffect(() => {
    if (linkUpdateStatus) finishQuestionOptionsUpdate();
  }, [linkUpdateStatus]);

  const finishQuestionOptionsUpdate = async () => {
    if (waFlowSave) {
      updateComponentInScreen(currentElementId, {
        googleReview: selectedQ?.googleReview,
      });
      setDetailActiveEditor(EditorType.ElementEditor);
    } else {
      await questionUpdateMutation.mutateAsync({
        qId: selectedQ.id,
        data: { googleReview: selectedQ?.googleReview },
      });
      setActiveTab(QuestionTabsEnum.Edit);
    }
    setLinkUpdateStatus(false);
  };

  const { primaryColor } = useMantineTheme();
  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <ScrollAreaAutosize>
        <Title order={3}>Google Reviews Setup</Title>
        <Stack px="lg" h="100%">
          <>
            <Switch
              label={translations("Google Reviews")}
              description={translations("Setup Google Page review for users")}
              labelPosition="left"
              checked={enableGoogleReview}
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
            {enableGoogleReview && (
              <>
                <Stack>
                  <Group>
                    {(() => {
                      switch (switchCondition) {
                        case Q.Smiley:
                          return (
                            <SimpleGrid cols={3} spacing={30}>
                              <Text fw={500}>
                                {translations(
                                  "Select the emojis for which Google Review to be enabled:",
                                )}
                              </Text>
                              <Text fw={500}> : </Text>
                              <Group style={{ minWidth: "250px" }}>
                                {Object.values(SmileyResponse).map((value) => (
                                  <Button
                                    key={value}
                                    variant={
                                      selectedSmileys.includes(value)
                                        ? "light"
                                        : "default"
                                    }
                                    gradient={{
                                      from: "#62CBE6",
                                      to: "#3F5BA9",
                                    }}
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
                                {translations(
                                  "Select minimum rating for enabling Google Review:",
                                )}
                              </Text>
                              <Text fw={500}> : </Text>
                              <Stack align="center">
                                <Rating
                                  value={minRating}
                                  onChange={setMinRating}
                                  size="xl"
                                />
                                <Text>
                                  {" "}
                                  {minRating} {translations("stars and above")}
                                </Text>
                              </Stack>
                            </SimpleGrid>
                          );
                        case Q.Opinion:
                          return (
                            <SimpleGrid cols={3} spacing={30}>
                              <Text fw={500}>
                                {" "}
                                {translations(
                                  "Select minimum scale value for enabling Google Review:",
                                )}{" "}
                              </Text>
                              <Text fw={500}> : </Text>
                              <Stack>
                                <Group style={{ minWidth: "250px" }}>
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
                                  For {minOpinion} and above.
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
                <Divider m="sm" />
                <Text fw={600} size="1.1rem" my="xs">
                  {translations("Google Review Links")}
                </Text>
                <Stack p="sm">
                  {teamsToDisplay &&
                    teamsToDisplay.map((team) => (
                      <AddGoogleReviewLinkForTeamModal
                        team={team}
                        surveyId={surveyId}
                        key={team?.id}
                        platform={ReviewPagePlatform.Google}
                      />
                    ))}
                </Stack>
              </>
            )}
          </>
        </Stack>
      </ScrollAreaAutosize>
      <Divider m="xs" />
      <Group justify="space-between" pb={"sm"} px={"sm"}>
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

export default GoogleReviewEditor;
