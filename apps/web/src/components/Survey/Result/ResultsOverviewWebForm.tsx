import { IconChartBar, IconFileDownload } from "@tabler/icons-react";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useResponseAnalytics } from "@/backend/surveys/response/response.query";
import { useAllResponseNPSForGraph } from "@/backend/surveys/surveys.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import OverallResponseGraphWebForm from "@/components/Graph/OverallResponseGraphWebForm.tsx";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { FlowQuestionSummary } from "@/components/whatsapp/flow-v2/utils/store.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { QuestionType, WaQuestions } from "@/types/enums.ts";

import HappyIndex from "./HappyIndex.tsx";
import LargeTextResponseSummary from "./LargeTextResponseSummary.tsx";
import SurveyQuestion from "./SurveyQuestion.tsx";
import SurveyStatsWebForm from "./SurveyStatsWebForm.tsx";

const ResultsOverviewWebForm = ({
  surveyId,
  aiResponseSummary,
  flowId,
  version,
  flowQuestions,
  questions,
}: {
  surveyId: string;
  aiResponseSummary: ResponseSummary[];
  flowId?: string;
  version?: number;
  flowQuestions: FlowQuestionSummary[];
  questions: Question[];
}) => {
  const { filterTeams } = useContext(SurveyContext);
  const { defaultLanguage } = useContext(SelectedLanguageContext);
  const [ranges, setRanges] = useState<Range[]>([{ key: "selection" }]);
  const { t: translations } = useTranslation();
  const targetRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!targetRef.current) return;
    const { default: generatePDF, Margin } = await import("react-to-pdf");
    generatePDF(targetRef, {
      filename: `survey-analytics-${surveyId}.pdf`,
      page: { margin: Margin.SMALL },
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
        : [ranges[0]?.startDate.toISOString(), ranges[0]?.endDate.toISOString()],
  });

  const [timePeriod, setTimePeriod] = useState("daily");
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const {
    data: graphResponse,
    isLoading: isrLoading,
    isRefetching: isrRefetching,
  } = useAllResponseNPSForGraph(timePeriod, userTimeZone, surveyId, filterTeams);

  useEffect(() => {
    if (ranges.length === 0) setRanges([{ key: "selection" }]);
  }, [ranges]);

  const [npsOverView, choiceWiseOverView] = useMemo(
    () =>
      responseAnalytics
        ? [Object.entries(responseAnalytics?.nps), Object.entries(responseAnalytics?.choiceWise)]
        : [[], []],
    [responseAnalytics],
  );

  const textAreaQuestions = useMemo(() => {
    return version === 1
      ? questions?.filter((question) => question?.type === QuestionType.TextArea)
      : flowQuestions.filter((q) => q.metaType === WaQuestions.TextArea);
  }, [questions, flowQuestions, version]);

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <div className="grid gap-4 lg:grid-cols-5">
            <Skeleton className="h-72 lg:col-span-3" />
            <Skeleton className="h-72 lg:col-span-2" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError ? (
        <ErrorComponent refetch={refetch} isRefetching={isRefetching} />
      ) : !npsOverView.length && !choiceWiseOverView.length ? (
        <Empty className="min-h-[60vh]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconChartBar />
            </EmptyMedia>
            <EmptyTitle>{translations("No data to analyse yet")}</EmptyTitle>
            <EmptyDescription>
              {translations("Charts appear here once the first responses come in.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {!flowId && <SurveyStatsWebForm surveyId={surveyId} />}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <CalenderIconDateRangePicker ranges={ranges} setRange={setRanges} />
            <Button variant="outline" size="sm" onClick={handleExport}>
              <IconFileDownload className="mr-1.5 size-4" />
              {translations("Export to PDF")}
            </Button>
          </div>

          <div ref={targetRef} className="flex flex-col gap-6">
            <HappyIndex surveyId={surveyId} />
            <OverallResponseGraphWebForm
              data={graphResponse}
              timePeriod={timePeriod}
              setTimePeriod={setTimePeriod}
              isLoading={isrLoading || isrRefetching}
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
              subscription={subscription!}
              currentSummary={aiResponseSummary}
              version={version}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(ResultsOverviewWebForm);
