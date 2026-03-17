"use client";

import React, { useContext, useEffect, useState } from "react";

import { ActionIcon, Divider, Flex, Stack, Tooltip } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useExtracted } from "next-intl";
import { Range } from "react-date-range";
import { Margin, usePDF } from "react-to-pdf";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";

import { useAllResponses } from "../../../backend/surveys/response/response.query";
import SurveyContext from "../../../context/SurveyContext";
import {
  LDResponse,
  QuestionType2,
  SmileyResponse,
  WaQuestions,
  YNResponse,
} from "../../../types/enums";
import { stringToColour } from "../../../utils/essential";
import {
  getfilteredResponseUsingLanguage,
  getFilteredResponseUsingTags,
} from "../../../utils/response";
import {
  getFilteredResponsesUsingTeam,
  mergeResponsesFromTeams,
} from "../../../utils/team/surveyTeam";
import RateupLoader from "../../Loaders/RateupLoader";
import NothingFound from "../../NothingFound/NothingFound";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";
import { QuestionBarChart2 } from "./Charts/QuestionBarChart";
import QuestionPieChart from "./Charts/QuestionPieChart";
import LargeTextResponseSummary from "./LargeTextResponseSummary";
import styles from "./ResultsOverview.module.css";

const WaResultsOverviewV2 = ({
  surveyId,
  screens = [],
  aiResponseSummary,
}: {
  surveyId: string;
  screens;
  aiResponseSummary: ResponseSummary[];
}) => {
  const [isAllowedQnsPresent, setIsAllowedQnsPresent] = useState(false);
  const { filterTeams, filterTags } = useContext(SurveyContext);
  const [ranges, setRange] = useState<Range[]>([]);
  const { toPDF, targetRef } = usePDF({
    page: {
      margin: Margin.MEDIUM,
    },
  });

  let chartData;
  const {
    isLoading,
    error,
    data: teamWiseResponses,
  } = useAllResponses(surveyId);
  let questions = screens?.flatMap((screen) =>
    screen.layout.children.filter(
      (child) => child.type !== QuestionType2.Footer && child.name,
    ),
  );

  const translations = useExtracted();
  const [isExporting, setIsExporting] = useState(false);
  const { data: subscription } = useSubscription();

  useEffect(() => {
    setIsAllowedQnsPresent(
      chartData?.some(
        (item) =>
          item.metaType === WaQuestions.Rating ||
          item.metaType === WaQuestions.Smiley ||
          item.metaType === WaQuestions.LD ||
          item.metaType === WaQuestions.YN ||
          item.metaType === WaQuestions.Opinion,
      ),
    );
  }, [chartData]);

  useEffect(() => {
    if (questions) {
      const allowedWaQuestionss = [
        WaQuestions.Rating,
        WaQuestions.Smiley,
        WaQuestions.LD,
        WaQuestions.YN,
        WaQuestions.Opinion,
        WaQuestions.RadioButtonsGroup,
        WaQuestions.CheckboxGroup,
        WaQuestions.TextArea,
      ];
      //   Check if any of the allowed question types are present in the survey
      const hasAllowedQuestions = questions.some((question) =>
        allowedWaQuestionss.includes(question.type as unknown as WaQuestions),
      );

      setIsAllowedQnsPresent(hasAllowedQuestions);
    }
  }, [questions]);

  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );
  const { mergedResponses } = mergeResponsesFromTeams(filteredResponsesByTeam);
  const { filteredResponsesByLanguage } = getfilteredResponseUsingLanguage(
    mergedResponses,
    "en",
  );
  const { filteredResponsesByTags, noofResponses } =
    getFilteredResponseUsingTags(filteredResponsesByLanguage, filterTags);

  useEffect(() => {
    if (!filteredResponsesByTags || !filteredResponsesByTags?.length) return;
    if (ranges.length === 0) {
      const endDate = dayjs();
      let startDate = dayjs();
      filteredResponsesByTags
        .map((res) => dayjs(res.createdAt))
        .forEach((responseDate) => {
          if (responseDate.isBefore(startDate)) startDate = responseDate;
        });
      setRange([
        {
          startDate: startDate?.toDate(),
          endDate: endDate.toDate(),
          key: "selection",
        },
      ]);
    }
  }, [ranges, filteredResponsesByTags]);
  if (isLoading) {
    return <RateupLoader h={"100dvh"} />;
  }

  if (error) {
    return <div>Error </div>;
  }

  if (!isAllowedQnsPresent) {
    return (
      <NothingFound text={translations("No Data available for Analysis")} />
    );
  }

  const prepareData = (questions: any[]) => {
    const filteredResponses = ranges[0]
      ? filteredResponsesByTags.filter((response) =>
          dayjs(response.createdAt).isBetween(
            ranges[0].startDate,
            ranges[0].endDate,
            "day",
            "[]",
          ),
        )
      : filteredResponsesByTags;
    return questions
      ?.filter((question) => question?.metaType !== WaQuestions.TextArea)
      .map((question) => {
        const responsesForQuestion = filteredResponses?.flatMap((response) =>
          response?.responses?.filter(
            (item: any) => item?.questionId === question?.id,
          ),
        );
        let promoters = 0;
        let passives = 0;
        let detractors = 0;
        let csat = 0;
        responsesForQuestion?.forEach((response: any) => {
          const rating = response?.response;
          switch (question?.metaType) {
            case WaQuestions.Rating:
              if (rating >= 4) {
                promoters++;
                csat++;
              } else if (rating == 3) passives++;
              else detractors++;
              break;
            case WaQuestions.Opinion:
              if (rating >= 9) {
                promoters++;
                csat++;
              } else if (rating >= 7) passives++;
              else detractors++;
              break;
            case WaQuestions.Smiley:
              if (
                [SmileyResponse.VeryHappy, SmileyResponse.Happy].includes(
                  rating,
                )
              ) {
                promoters++;
                csat++;
              } else if (rating === SmileyResponse.Neutral) passives++;
              else detractors++;
              break;
            case WaQuestions.LD:
              if (rating === LDResponse.Like) {
                promoters++;
                csat++;
              } else detractors++;
              break;
            case WaQuestions.YN:
              if (rating === YNResponse.Yes) {
                promoters++;
                csat++;
              } else detractors++;
              break;
          }
        });
        const total = promoters + passives + detractors;
        const nps = total ? ((promoters - detractors) / total) * 100 : null;
        const csatScore = Math.round((csat / noofResponses) * 100);
        let localizedTitle = question.label;

        let choices = null;
        if (question["data-source"]) {
          choices = question["data-source"];
        }
        return {
          question:
            getReplacedTitleFromVariable({
              title: localizedTitle,
              surveyId,
            }) || localizedTitle,
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
          csat: csatScore,
          enableNpsAnalytics: question?.enableNpsAnalytics ?? false,
          metaType: question?.metaType,
        };
      });
  };

  chartData = prepareData(questions);
  let enablewholeNpsAnalytics =
    chartData?.filter((item) => item.enableNpsAnalytics === true)?.length > 0;

  if (!filteredResponsesByTags.length)
    return <NothingFound text={translations("No responses yet")} />;

  return (
    <Stack className={styles["results-overview-root-div"]} h={"100%"} p={3}>
      {chartData?.length > 0 && (
        <Stack>
          <PaperLayout p={"md"}>
            <Flex justify={"space-between"}>
              <Tooltip label={"Export to Pdf"}>
                <ActionIcon
                  onClick={() => toPDF()}
                  loading={isExporting}
                  variant="subtle"
                >
                  <IconTableExport size={"1.5rem"} />
                </ActionIcon>
              </Tooltip>
              <DateRangePickerButton
                onChange={(r) => setRange(r ? [r["selection"]] : [])}
                ranges={ranges}
              />
            </Flex>
          </PaperLayout>
          <Stack p={5} ref={targetRef}>
            {isAllowedQnsPresent && enablewholeNpsAnalytics && (
              <>
                <Heading subtitle={translations("NPS Overview")} />
                <PaperLayout p={"xl"}>
                  {chartData
                    ?.filter(
                      (item) =>
                        item.metaType === WaQuestions.Rating ||
                        item.metaType === WaQuestions.Smiley ||
                        item.metaType === WaQuestions.LD ||
                        item.metaType === WaQuestions.YN ||
                        item.metaType === WaQuestions.Opinion,
                    )
                    ?.filter((item) => item.enableNpsAnalytics === true)
                    ?.map((item, index, filteredArray) => (
                      <React.Fragment key={index}>
                        <QuestionPieChart
                          no={index + 1}
                          type={item.metaType}
                          responseCount={item?.responses?.length}
                          question={item.question}
                          data={item.nps}
                          csatScore={item?.csat}
                        />
                        {index < filteredArray?.length - 1 && (
                          <Divider my="md" />
                        )}
                      </React.Fragment>
                    ))}
                </PaperLayout>
              </>
            )}
            <Heading subtitle={translations("Question Wise Overview")} />
            <PaperLayout p={"xl"}>
              {chartData
                ?.filter(
                  (item) =>
                    item.metaType === WaQuestions.Rating ||
                    item.metaType === WaQuestions.Smiley ||
                    item.metaType === WaQuestions.LD ||
                    item.metaType === WaQuestions.YN ||
                    item.metaType === WaQuestions.Opinion ||
                    item.metaType === WaQuestions.CheckboxGroup ||
                    item.metaType === WaQuestions.RadioButtonsGroup ||
                    item.metaType === WaQuestions.Dropdown,
                )
                ?.map((item, index) => (
                  <React.Fragment key={index}>
                    <QuestionBarChart2
                      key={index}
                      question={item?.question}
                      no={index + 1}
                      choices={item?.choices?.map((choice) => ({
                        value: choice?.id,
                        label: choice?.title,
                        color: stringToColour(choice?.id),
                      }))}
                      data={item?.responses}
                      questionType={item?.metaType}
                    />
                    {index < chartData?.length - 1 && <Divider my="md" />}
                  </React.Fragment>
                ))}
            </PaperLayout>
          </Stack>
        </Stack>
      )}
      <LargeTextResponseSummary
        surveyId={surveyId}
        questions={questions?.filter(
          (question) => question?.metaType === WaQuestions.TextArea,
        )}
        subscription={subscription}
        version={2}
        currentSummary={aiResponseSummary}
      />
    </Stack>
  );
};

export default WaResultsOverviewV2;
