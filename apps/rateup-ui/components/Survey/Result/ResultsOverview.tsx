import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import QuestionPieChart from "./Charts/QuestionPieChart";
import QuestionBarChart from "./Charts/QuestionBarChart";
import { QuestionType } from "../../../types/enums";
import { Divider, Stack } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import Heading from "../../styled/Heading/Heading";
import SurveyContext from "../../../context/SurveyContext";
import NothingFound from "../../NothingFound/NothingFound";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { TeamWiseResponses } from "../../../backend/surveys/response/response.api";
import {
  getFilteredResponsesUsingTeam,
  mergeResponsesFromTeams,
} from "../../../utils/team/surveyTeam";
import { getfilteredResponseUsingLanguage } from "../../../utils/response";

const ResultsOverview = () => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const [isAllowedQnsPresent, setIsAllowedQnsPresent] = useState(false);
  const { filterTeams } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  let chartData;
  const {
    isLoading,
    error,
    data: teamWiseResponses,
  } = useAllResponses(surveyId);
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(surveyId);

  useEffect(() => {
    if (questions) {
      const titleMap: Record<string, any> = {};
      const languageSet = new Set<string>();
      for (const question of questions) {
        titleMap[question.id] = question.title;
        Object.keys(question.title).forEach((lang) => languageSet.add(lang));
      }
    }
  }, [teamWiseResponses, questions]);

  useEffect(() => {
    setIsAllowedQnsPresent(
      chartData?.some(
        (item) =>
          item.type === QuestionType.Rating ||
          item.type === QuestionType.Smiley ||
          item.type === QuestionType.LD ||
          item.type === QuestionType.YN ||
          item.type === QuestionType.Opinion,
      ),
    );
  }, [chartData]);
  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );
  const { mergedResponses, noofResponses } = mergeResponsesFromTeams(
    filteredResponsesByTeam,
  );
  const { filteredResponsesByLanguage } = getfilteredResponseUsingLanguage(
    mergedResponses,
    selectedLanguage,
  );
  if (isLoading || isQLoading) {
    return <div>Loading...</div>;
  }

  if (error || QError) {
    return <div>Error </div>;
  }

  const prepareData = (
    questions: any[],
    surveyResponses: Array<TeamWiseResponses>,
  ) => {
    return questions?.map((question) => {
      const responsesForQuestion = filteredResponsesByLanguage?.flatMap(
        (response) =>
          response?.responses?.filter(
            (item: any) => item?.questionId === question?.id,
          ),
      );
      let promoters = 0;
      let passives = 0;
      let detractors = 0;
      responsesForQuestion?.forEach((response: any) => {
        const rating = response?.response[response?.type];
        switch (response?.type) {
          case QuestionType.Rating:
          case QuestionType.Opinion:
            if (rating >= 9) promoters++;
            else if (rating >= 7) passives++;
            else detractors++;
            break;
          case QuestionType.Smiley:
            if (["VeryHappy", "Happy"].includes(rating)) promoters++;
            else if (rating === "Neutral") passives++;
            else detractors++;
            break;
          case QuestionType.LD:
            if (rating === "Like") promoters++;
            else detractors++;
            break;
          case QuestionType.YN:
            if (rating === "Yes") promoters++;
            else detractors++;
            break;
        }
      });
      const total = promoters + passives + detractors;
      const nps = total ? ((promoters - detractors) / total) * 100 : null;
      let localizedTitle = question?.title?.English;
      if (
        question?.title &&
        question?.title[selectedLanguage ? selectedLanguage : defaultLanguage]
      ) {
        localizedTitle =
          question?.title[
            selectedLanguage ? selectedLanguage : defaultLanguage
          ];
      }
      let choices = null;
      if (
        question?.choices &&
        question?.choices[selectedLanguage ? selectedLanguage : defaultLanguage]
      ) {
        choices =
          question?.choices[
            selectedLanguage ? selectedLanguage : defaultLanguage
          ];
      }
      return {
        question:
          question?.title[
            selectedLanguage ? selectedLanguage : defaultLanguage
          ],
        choices: choices,
        type: question?.type,
        responses: responsesForQuestion,
        nps: {
          score: nps,
          promoters,
          detractors,
          passives,
          total,
        },
      };
    });
  };
  chartData = prepareData(questions, filteredResponsesByTeam);
  return (
    <>
      {isAllowedQnsPresent ? (
        <Stack h={"100%"}>
          <Stack style={{ overflow: "scroll", height: "100%", padding: 2 }}>
            <Stack style={{ marginBottom: "20px" }}>
              {isAllowedQnsPresent && <Heading subtitle="NPS Overview" />}
              <PaperLayout style={{ marginBottom: "20px" }}>
                {chartData
                  ?.filter(
                    (item) =>
                      item.type === QuestionType.Rating ||
                      item.type === QuestionType.Smiley ||
                      item.type === QuestionType.LD ||
                      item.type === QuestionType.YN ||
                      item.type === QuestionType.Opinion,
                  )
                  ?.map((item, index, filteredArray) => (
                    <React.Fragment key={index}>
                      <QuestionPieChart
                        no={index + 1}
                        type={item.type}
                        responseCount={noofResponses}
                        question={item.question}
                        data={item.nps}
                      />
                      {index < filteredArray?.length - 1 && <Divider my="md" />}
                    </React.Fragment>
                  ))}
              </PaperLayout>
              <Heading subtitle="Question Wise Overview" />
              <PaperLayout style={{ marginBottom: "20px" }}>
                {chartData
                  ?.filter(
                    (item) =>
                      item.type === QuestionType.Rating ||
                      item.type === QuestionType.Smiley ||
                      item.type === QuestionType.LD ||
                      item.type === QuestionType.YN ||
                      item.type === QuestionType.Opinion ||
                      item.type === QuestionType.MCQ ||
                      item.type === QuestionType.MSQ ||
                      item.type === QuestionType.DDSS ||
                      item.type === QuestionType.DDMS,
                  )
                  ?.map((item, index) => (
                    <React.Fragment key={index}>
                      <QuestionBarChart
                        key={index}
                        question={item?.question}
                        no={index + 1}
                        choices={item?.choices}
                        data={item?.responses}
                        questionType={item?.type}
                      />
                      {index < chartData?.length - 1 && <Divider my="md" />}
                    </React.Fragment>
                  ))}
              </PaperLayout>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <NothingFound text="No quantitative question responses!" />
      )}
    </>
  );
};

export default ResultsOverview;
