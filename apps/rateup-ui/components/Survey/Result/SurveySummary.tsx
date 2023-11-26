import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import { Rating, Text, Group, Chip, Button, Stack } from "@mantine/core";
import { IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import SurveyContext from "../../../context/SurveyContext";
import NothingFound from "../../NothingFound/NothingFound";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType } from "../../../types/enums";
import {
  getFilteredResponsesUsingTeam,
  mergeResponsesFromTeams,
} from "../../../utils/team/surveyTeam";
import { getfilteredResponseUsingLanguage } from "../../../utils/response";

type ResponseCounts = Record<string, Record<string, number>>;

// count responses
const countResponses = (surveyResponses) => {
  const counts = {};
  const responseTypeMap = {};

  const validResponseTypes = [
    QuestionType.Rating,
    QuestionType.MCQ,
    QuestionType.Opinion,
    QuestionType.LD,
    QuestionType.YN,
    QuestionType.MSQ,
  ];

  for (const response of surveyResponses) {
    for (const question of response.responses) {
      const questionId = question.questionId;
      const responseType = question.type;
      let responseValue = question.response[responseType];

      if (!validResponseTypes.includes(responseType)) continue;

      if (!counts[questionId]) {
        counts[questionId] = {};
      }

      if (responseType === QuestionType.MSQ) {
        if (typeof responseValue === "string") {
          responseValue = responseValue.split(",");
        } else if (Array.isArray(responseValue)) {
          // do nothing, it's already in the correct format
        } else {
          console.error(
            `Invalid format for 'Multiple Select' responseValue: ${responseValue}`,
          );
          continue;
        }

        for (const option of responseValue) {
          const trimmedOption = option.trim();
          counts[questionId][trimmedOption] =
            (counts[questionId][trimmedOption] || 0) + 1;
        }
      } else {
        counts[questionId][responseValue] =
          (counts[questionId][responseValue] || 0) + 1;
      }

      responseTypeMap[questionId] = responseType;
    }
  }

  return { counts, responseTypeMap };
};

const SurveySummary = () => {
  const router = useRouter();
  const { surveyId } = router.query;
  const { filterTeams } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );

  if (Array.isArray(surveyId)) {
    throw new Error("surveyId is an array");
  }
  const {
    data: teamWiseResponses,
    error,
    isLoading,
  } = useAllResponses(surveyId);
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);
  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );
  const { mergedResponses, noofResponses } = mergeResponsesFromTeams(
    filteredResponsesByTeam,
  );
  useEffect(() => {}, [selectedLanguage]);
  const { filteredResponsesByLanguage } = getfilteredResponseUsingLanguage(
    mergedResponses,
    selectedLanguage,
  );
  const [responseCounts, setResponseCounts] = useState<ResponseCounts>({});
  const [responseTypeMap, setResponseTypeMap] = useState<
    Record<string, string>
  >({});
  const [questionTitleMap, setQuestionTitleMap] = useState<Record<string, any>>(
    {},
  );
  useEffect(() => {
    if (teamWiseResponses) {
      const { counts, responseTypeMap } = countResponses(
        filteredResponsesByLanguage,
      );
      setResponseCounts(counts);
      setResponseTypeMap(responseTypeMap);
    }
  }, [teamWiseResponses, filterTeams, selectedLanguage]);
  useEffect(() => {
    if (questions) {
      const titleMap: Record<string, any> = {};
      const languageSet = new Set<string>();
      for (const question of questions) {
        titleMap[question.id] = question.title;
        Object.keys(question.title).forEach((lang) => languageSet.add(lang));
      }
      setQuestionTitleMap(titleMap);
    }
  }, [questions]);
  function getPropertyValue(obj, prop) {
    if (obj.hasOwnProperty(prop)) {
      return obj[prop];
    }
    return null;
  }
  if (isLoading || isQLoading) return <div>Loading...</div>;
  if (error || QError) return <div>Error occurred</div>;

  return (
    <Stack mt={10}>
      {Object.entries(responseCounts).length === 0 && (
        <NothingFound text="No quantitative question responses!" />
      )}
      <Stack>
        {Object.entries(responseCounts)?.map(([questionId, responseCounts]) => {
          const totalResponses = Object.values(responseCounts).reduce(
            (a, b) => a + b,
            0,
          );
          return (
            <PaperLayout
              key={questionId}
              style={{ marginBottom: "20px", marginLeft: 2, marginRight: 2 }}
            >
              <>
                <Text fw={700} mb="sm" size={"20px"} c="dark.3">
                  {getPropertyValue(
                    questionTitleMap[questionId]
                      ? questionTitleMap
                      : new Object(),
                    selectedLanguage ? selectedLanguage : defaultLanguage,
                  )}
                </Text>
                {Object.entries(responseCounts)?.map(([response, count]) => {
                  const percentage = ((count / totalResponses) * 100)?.toFixed(
                    2,
                  );
                  const voteText = count > 1 ? "votes" : "vote";

                  switch (responseTypeMap[questionId]) {
                    case QuestionType.Opinion:
                      return (
                        <Group key={response} pb="sm">
                          <Chip
                            color="indigo"
                            variant="light"
                            style={{ minWidth: "60px" }}
                          >
                            <b>{response} </b>
                          </Chip>
                          :
                          <Text pl="sm">
                            {count} {voteText} ( {percentage}% )
                          </Text>
                        </Group>
                      );
                    case QuestionType.MCQ:
                      return (
                        <Group key={response} pb="sm">
                          <Chip
                            color="indigo"
                            variant="light"
                            style={{ minWidth: "120px" }}
                          >
                            {response}
                          </Chip>
                          :
                          <Text pl="sm">
                            {count} {voteText} ( {percentage}% )
                          </Text>
                        </Group>
                      );
                    case QuestionType.Rating:
                      return (
                        <Group key={response}>
                          <Rating value={parseInt(response)} readOnly />
                          <Text>
                            ({count} {voteText})
                          </Text>
                        </Group>
                      );

                    case QuestionType.LD:
                      return (
                        <Group key={response}>
                          {response === "Like" ? (
                            <Group align="center" mb="sm">
                              <Button
                                color={"teal"}
                                size="sm"
                                px="md"
                                radius="md"
                                leftSection={<IconThumbUpFilled />}
                                disabled
                              >
                                Like ({count})
                              </Button>
                              {percentage}%
                            </Group>
                          ) : (
                            <Group align="center">
                              <Button
                                color={"red"}
                                size="sm"
                                px="md"
                                radius="md"
                                leftSection={<IconThumbDownFilled />}
                                disabled
                              >
                                Dislike ({count})
                              </Button>
                              {percentage}%
                            </Group>
                          )}
                        </Group>
                      );

                    case QuestionType.YN:
                      return (
                        <Group key={response}>
                          {response === "Yes" ? (
                            <Group align="center" mb="md">
                              <Button
                                color={"red"}
                                size="sm"
                                px="md"
                                radius="md"
                                disabled
                              >
                                Yes ({count})
                              </Button>
                              {percentage}%
                            </Group>
                          ) : (
                            <Group align="center">
                              <Button
                                color={"red"}
                                size="sm"
                                px="md"
                                radius="md"
                                disabled
                              >
                                No ({count})
                              </Button>
                              {percentage}%
                            </Group>
                          )}
                        </Group>
                      );

                    case QuestionType.MSQ:
                      return (
                        <span key={response}>
                          <Group pb="sm">
                            <Chip
                              color="indigo"
                              variant="light"
                              style={{ minWidth: "120px" }}
                            >
                              {response}
                            </Chip>
                            :
                            <Text pl="sm">
                              {count} {voteText} ( {percentage}% )
                            </Text>
                          </Group>
                        </span>
                      );

                    default:
                      return (
                        <div key={response}>
                          <Text>
                            {response} : {count} {voteText}
                          </Text>
                        </div>
                      );
                  }
                })}
              </>
            </PaperLayout>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default SurveySummary;
