import React, { useContext, useEffect, useMemo, useState } from "react";

import { Badge, Divider, Flex, Stack, Text } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";
import { Margin, usePDF } from "react-to-pdf";

import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";

import { useResponseAnalytics } from "../../../backend/surveys/response/response.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import { QuestionType, WaQuestions } from "../../../types/enums";
import { stringToColour } from "../../../utils/essential";
import { getResponseArrayByQuestionType } from "../../../utils/response";
import RateupLoader from "../../Loaders/RateupLoader";
import NothingFound from "../../NothingFound/NothingFound";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";
import QuestionBarChart from "./Charts/QuestionBarChart";
import QuestionPieChart from "./Charts/QuestionPieChart";
import LargeTextResponseSummary from "./LargeTextResponseSummary";
import styles from "./ResultsOverview.module.css";
import { ResponseGraphBySurvey, SurveyResponseStats } from "./SurveyStats";

const ResultsOverview = ({
  surveyId,
  aiResponseSummary,
  survey,
  flowId,
  version,
  flowQuestions,
  questions,
}) => {
  const { filterTeams, filterTags } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const [ranges, setRange] = useState<Range[]>([{ key: "selection" }]);
  const translations = useTranslations();
  const [isExporting, setIsExporting] = useState(false);
  const { data: subscription } = useSubscription();
  const { toPDF, targetRef } = usePDF({
    page: {
      margin: Margin.MEDIUM,
    },
  });

  const {
    data: responseAnalytics,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useResponseAnalytics(surveyId, {
    teamMapIds: filterTeams,
    dateRange:
      !ranges.length || !ranges[0].startDate || !ranges[0].endDate
        ? []
        : [
            ranges[0]?.startDate.toISOString(),
            ranges[0]?.endDate.toISOString(),
          ],
  });

  useEffect(() => {
    if (ranges.length === 0) {
      setRange([{ key: "selction" }]);
    }
  }, [ranges]);

  const [npsOverView, choiceWiseOverView] = useMemo(
    () =>
      responseAnalytics
        ? [
            Object.entries(responseAnalytics?.nps),
            Object.entries(responseAnalytics?.choiceWise),
          ]
        : [[], []],
    [responseAnalytics],
  );

  const textAreaQuestions = useMemo(() => {
    return version === 1
      ? questions?.filter(
          (question) => question?.type === QuestionType.TextArea,
        )
      : flowQuestions.filter((q) => q.metaType === WaQuestions.TextArea);
  }, [questions, flowQuestions, version]);

  function getQuestion(questionId) {
    const question =
      version === 1
        ? questions?.find((question) => question?.id === questionId)
        : flowQuestions.find((q) => q.id === questionId);
    return {
      type: version === 1 ? question.type : question.metaType,
      questionTitle:
        version === 1
          ? question.title || question.label
          : question.header || question.label,
    };
  }

  return (
    <Stack className={styles["results-overview-root-div"]} p={3}>
      {/* {
        isLoading?("loading"):(
          <div>
            analytics:{JSON.stringify(happyAnalytics)}
          </div>
        )
      } */}
      <Flex gap={"xs"} direction={flowId ? "column" : "row"}>
        {!flowId && (
          <SurveyResponseStats
            translations={translations}
            flowId={flowId}
            surveyId={surveyId}
          />
        )}
        <div style={{ flex: 1 }}>
          <ResponseGraphBySurvey
            surveyId={surveyId}
            translations={translations}
          />
        </div>
      </Flex>
      <PaperLayout p={"md"}>
        <Flex justify={"space-between"}>
          <RateupButtonPrimary
            onClick={() => toPDF()}
            loading={isExporting}
            leftIcon={<IconTableExport size={"1rem"} />}
            title="Export to Pdf"
          />
          <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
        </Flex>
      </PaperLayout>
      <Stack ref={targetRef}>
        {isPending ? (
          <RateupLoader />
        ) : isError ? (
          <ErrorComponent refetch={refetch} isRefetching={isRefetching} />
        ) : (
          !npsOverView.length &&
          !choiceWiseOverView.length && (
            <NothingFound
              text={translations("No Data available for Analysis")}
            />
          )
        )}
        {npsOverView.length > 0 && (
          <>
            <Heading subtitle={translations("NPS Overview")} />
            <PaperLayout>
              {npsOverView.map(([questionId, question], index) => {
                const questionDetails = getQuestion(questionId);
                return (
                  <Stack key={questionId}>
                    <QuestionPieChart
                      no={index + 1}
                      type={questionDetails?.type}
                      responseCount={question?.responseCount}
                      question={
                        typeof questionDetails?.questionTitle === "object"
                          ? getReplacedTitleFromVariable({
                              title:
                                questionDetails?.questionTitle[defaultLanguage],
                              surveyId,
                            })
                          : questionDetails?.questionTitle
                      }
                      data={question.npsData}
                      csatScore={question?.csatScore}
                    />
                    {index < npsOverView.length - 1 && <Divider my="md" />}
                  </Stack>
                );
              })}
            </PaperLayout>
          </>
        )}
        {choiceWiseOverView.length > 0 && (
          <>
            <Heading subtitle={translations("Question Wise Overview")} />
            <PaperLayout>
              {choiceWiseOverView.map(([questionId, question], index) => {
                const questionDetails = getQuestion(questionId);
                return (
                  <>
                    <Stack key={questionId}>
                      {question?.subData ? (
                        <Stack>
                          <Flex justify="space-between">
                            <Flex gap={"xs"} w={"85%"}>
                              <Text fw={800} c={"dark.3"}>
                                {index + 1}.{" "}
                              </Text>
                              <Text fw={800} c={"dark.3"}>
                                {getReplacedTitleFromVariable({
                                  title:
                                    questionDetails?.questionTitle[
                                      defaultLanguage
                                    ],
                                  surveyId,
                                })}
                              </Text>
                            </Flex>
                            <Badge variant="dot">{questionDetails?.type}</Badge>
                          </Flex>
                          {Object.entries(question.subData).map(
                            ([subq, data], subIndex) => (
                              <Stack px={"sm"} key={subq}>
                                <QuestionBarChart
                                  no={subIndex + 1}
                                  questionType={questionDetails?.type}
                                  responseCount={question?.responseCount}
                                  question={subq}
                                  data={data.map((c) => ({
                                    ...c,
                                    fill: stringToColour(c.choice),
                                  }))}
                                  version={version}
                                />
                                {subIndex <
                                  Object.entries(question.subData).length -
                                    1 && <Divider my="md" />}
                              </Stack>
                            ),
                          )}
                        </Stack>
                      ) : (
                        <QuestionBarChart
                          no={index + 1}
                          questionType={questionDetails?.type}
                          responseCount={question?.responseCount}
                          question={
                            typeof questionDetails?.questionTitle === "object"
                              ? getReplacedTitleFromVariable({
                                  title:
                                    questionDetails.questionTitle[
                                      defaultLanguage
                                    ],
                                  surveyId,
                                })
                              : questionDetails?.questionTitle
                          }
                          data={question.data.map((c) => ({
                            ...c,
                            fill:
                              getResponseArrayByQuestionType(
                                questionDetails?.type as any,
                              )?.find(
                                (ch) =>
                                  ch.value.toString() === c.choice.toString(),
                              )?.color ?? stringToColour(c.choice),
                          }))}
                          version={version}
                        />
                      )}
                      {index < choiceWiseOverView.length - 1 && (
                        <Divider my="md" />
                      )}
                    </Stack>
                  </>
                );
              })}
            </PaperLayout>
          </>
        )}
      </Stack>
      <LargeTextResponseSummary
        surveyId={surveyId}
        questions={textAreaQuestions}
        subscription={subscription}
        currentSummary={aiResponseSummary}
        version={version}
      />
    </Stack>
  );
};

export default React.memo(ResultsOverview);
