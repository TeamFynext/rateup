import React, { useState, useEffect } from "react";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  Paper,
  TextInput,
  Rating,
  Group,
  Title,
  Stack,
  Switch,
  Text,
  SimpleGrid,
  Button,
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
import {
  usePublicSurveyGoogleLink,
  useUpdateSurveyGoogleLinkMutation,
} from "../../../backend/surveys/surveys.query";
import { mapSmileyIcon } from "../TakeSurvey/RatingSmiley";
interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}

const GoogleReviewEditor = ({
  selectedQ,
  setSelectedQ,
  setActiveTab,
}: IProps) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const [linkUpdateStatus, setLinkUpdateStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
    setIsSaving,
  });
  const googleLinkUpdateMutation = useUpdateSurveyGoogleLinkMutation(
    surveyId,
    setLinkUpdateStatus,
  );

  const [enableGoogleReview, setEnableGoogleReview] = useState(false);
  const [googleReviewLink, setGoogleReviewLink] = useState("");
  const [minRating, setMinRating] = useState(3);
  const [minOpinion, setMinOpinion] = useState(6);
  const [selectedSmileys, setSelectedSmileys] = useState([
    "VeryHappy",
    "Happy",
  ]);

  const updateGoogleReview = (googleReview: any) => {
    selectedQ && setSelectedQ({ ...selectedQ, googleReview });
    //selectedQ &&  console.log({ ...selectedQ, googleReview})
  };

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
      switch (selectedQ?.type) {
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
        color: "info",
        title: "Configure Google Review",
        message: "Enter condition and Google page URL",
        icon: <IconInfoCircle size="1rem" />,
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

  const SMILEY_OPTIONS = Object.entries(SmileyResponse).map(
    ([type, value]) => ({
      value: type,
      label: value,
    }),
  );

  const {
    isLoading,
    isError,
    data: googleLink,
  } = usePublicSurveyGoogleLink(surveyId?.toString());

  useEffect(() => {
    if (googleLink) setGoogleReviewLink(googleLink);
  }, [googleLink]);

  const handleSave = async () => {
    if (googleReviewLink.length > 4) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Enabling google review",
        message: `Hold on, your changes are getting updated...`,
        autoClose: false,
        withCloseButton: false,
      });

      try {
        if (googleReviewLink !== googleLink) {
          setIsSaving(true);
          await googleLinkUpdateMutation.mutateAsync({
            data: { googleLink: googleReviewLink },
          });
        } else {
          setLinkUpdateStatus(true);
        }
      } catch (error) {
        handleError(error);
      }
    } else {
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Error",
        message: "Enter valid Google Link",
        icon: <IconX size="1rem" />,
        autoClose: 2000,
      });
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

  useEffect(() => {
    if (linkUpdateStatus) finishQuestionOptionsUpdate();
  }, [linkUpdateStatus]);

  const finishQuestionOptionsUpdate = async () => {
    await questionUpdateMutation.mutateAsync({
      qId: selectedQ.id,
      data: { googleReview: selectedQ?.googleReview },
    });

    setActiveTab(QuestionTabsEnum.Edit);
    setLinkUpdateStatus(false);
  };

  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <Title order={3}>Google Reviews Setup</Title>
      <Paper
        p="xl"
        style={{ minHeight: "350px", minWidth: "600px", maxWidth: "600px" }}
      >
        <Group align="center" justify="center" pb="xl">
          <Switch.Group
            pb={30}
            label="Google Reviews"
            description="Setup Google Page review for users."
          >
            <Group></Group>
          </Switch.Group>

          <Stack justify="center">
            <Switch
              px={30}
              py={20}
              checked={enableGoogleReview}
              onChange={(event) => handleSwitch(event)}
              label="Enable"
            />
          </Stack>
        </Group>

        {enableGoogleReview && (
          <Stack px={30} py={10} style={{ maxWidth: "600px" }}>
            <Group pb={30}>
              {(() => {
                switch (selectedQ?.type) {
                  case Q.Smiley:
                    return (
                      <SimpleGrid cols={3} spacing={30}>
                        <Text fw={500}>
                          {" "}
                          Select the emojis for which Google Review to be
                          enabled:{" "}
                        </Text>
                        <Text fw={500}> : </Text>
                        <Group style={{ minWidth: "300px" }}>
                          {SMILEY_OPTIONS.map(({ value, label }) => (
                            <Button
                              key={value}
                              variant={
                                selectedSmileys.includes(value)
                                  ? "gradient"
                                  : "default"
                              }
                              gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
                              onClick={() => updateSmileyResponse(value)}
                              style={{ minHeight: "20px", maxWidth: "70px" }}
                            >
                              {mapSmileyIcon(value)}
                            </Button>
                          ))}
                        </Group>
                      </SimpleGrid>
                    );
                  case Q.Rating:
                    return (
                      <SimpleGrid cols={3} spacing={30}>
                        <Text fw={500}>
                          {" "}
                          Select minimum rating for enabling Google Review:{" "}
                        </Text>
                        <Text fw={500}> : </Text>
                        <Stack align="center">
                          <Rating
                            value={minRating}
                            onChange={setMinRating}
                            size="xl"
                          />
                          <Text> {minRating} stars and above.</Text>
                        </Stack>
                      </SimpleGrid>
                    );
                  case Q.Opinion:
                    return (
                      <SimpleGrid cols={3} spacing={30}>
                        <Text fw={500}>
                          {" "}
                          Select minimum scale value for enabling Google Review:{" "}
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
                                    color={minOpinion === i ? "blue" : "blue.9"}
                                    variant={
                                      minOpinion === i ? "gradient" : "default"
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

            <SimpleGrid cols={3} spacing={30}>
              <Text fw={500}> Google Review Link </Text>
              <Text fw={500}> : </Text>
              <TextInput
                style={{ minWidth: "300px" }}
                type="text"
                withAsterisk
                placeholder="Enter Google Review Link"
                value={googleReviewLink}
                onChange={(e) => setGoogleReviewLink(e.target.value)}
                autoComplete="off"
              />
            </SimpleGrid>
          </Stack>
        )}
      </Paper>

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
          loading={isSaving}
        />
      </Group>
    </Stack>
  );
};

export default GoogleReviewEditor;
