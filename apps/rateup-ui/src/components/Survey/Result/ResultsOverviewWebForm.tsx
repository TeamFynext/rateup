"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

import { Flex } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";
import generatePDF, { Margin } from "react-to-pdf";

import { QuestionType, WaQuestions } from "@/types/enums.ts";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useResponseAnalytics } from "@/backend/surveys/response/response.query";
import { useAllResponseNPSForGraph } from "@/backend/surveys/surveys.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import OverallResponseGraphWebForm from "@/components/Graph/OverallResponseGraphWebForm.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";

import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import HappyIndex from "./HappyIndex.tsx";
import LargeTextResponseSummary from "./LargeTextResponseSummary.tsx";
import SurveyQuestion from "./SurveyQuestion.tsx";
import SurveyStatsWebForm from "./SurveyStatsWebForm.tsx";

const ResultsOverviewWebForm = ({
  surveyId,
  aiResponseSummary,
  survey,
  flowId,
  version,
  flowQuestions,
  questions,
}) => {
  const { filterTeams } = useContext(SurveyContext);
  const { defaultLanguage } = useContext(SelectedLanguageContext);
  const [ranges, setRanges] = useState<Range[]>([{ key: "selection" }]);
  const { t: translations } = useTranslation();
  const targetRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (!targetRef.current) return;
    generatePDF(targetRef, {
      filename: `survey-analytics-${surveyId}.pdf`,
      page: {
        margin: Margin.SMALL,
      },
    });
  };
  const { data: subscription } = useSubscription();

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
  const [timePeriod, setTimePeriod] = useState("daily");
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const {
    data: graphResponse,
    isLoading: isrLoading,
    isRefetching: isrRefetching,
  } = useAllResponseNPSForGraph(
    timePeriod,
    userTimeZone,
    surveyId,
    filterTeams,
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    if (ranges.length === 0) {
      setRanges([{ key: "selection" }]);
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

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <RateupLoader />
      ) : isError ? (
        <ErrorComponent refetch={refetch} isRefetching={isRefetching} />
      ) : (
        !npsOverView.length &&
        !choiceWiseOverView.length && (
          <NothingFound text={translations("No Data available for Analysis")} />
        )
      )}
      {!flowId && <SurveyStatsWebForm surveyId={surveyId} />}
      <PaperLayout p={"md"}>
        <Flex justify={"space-between"}>
          <RateupButtonPrimary
            onClick={handleExport}
            leftIcon={<IconTableExport size={"1rem"} />}
            title="Export to Pdf"
          />
          <CalenderIconDateRangePicker ranges={ranges} setRange={setRanges} />
        </Flex>
      </PaperLayout>
      <div ref={targetRef} className="flex flex-col gap-6">
        <HappyIndex surveyId={surveyId} />
        <OverallResponseGraphWebForm
          data={graphResponse}
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          isLoading={isrLoading || isrRefetching}
          onRefresh={async () => {
            await queryClient.invalidateQueries({
              queryKey: [
                [
                  "reponse-nps",
                  "graph-nps",
                  timePeriod,
                  userTimeZone,
                  surveyId,
                  filterTeams,
                ],
              ],
            });
          }}
        />
        <SurveyQuestion
          choiceWise={choiceWiseOverView}
          NPS={npsOverView}
          flowQuestions={flowQuestions}
          questions={questions}
          version={version}
          surveyId={surveyId}
          defaultLanguage={defaultLanguage}
        />
        <LargeTextResponseSummary
          surveyId={surveyId}
          questions={textAreaQuestions}
          subscription={subscription}
          currentSummary={aiResponseSummary}
          version={version}
        />
      </div>
    </div>
  );
};

export default React.memo(ResultsOverviewWebForm);
