import React, { useContext, useEffect, useMemo, useState } from "react";

import { Flex } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Range } from "react-date-range";
import { Margin, usePDF } from "react-to-pdf";

import { useAllResponseNPSForGraph } from "@/backend/surveys/surveys.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import OverallResponseGraphWebForm from "@/components/Graph/OverallResponseGraphWebForm";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import NothingFound from "@/components/NothingFound/NothingFound";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import useTranslations from "@/dictionaries/useTranslation";

import { useResponseAnalytics } from "../../../backend/surveys/response/response.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import HappyIndex from "./HappyIndex";
import SurveyQuestion from "./SurveyQuestion";
import SurveyStatsWebForm from "./SurveyStatsWebForm";

const ResultsOverviewWebForm = ({
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
  const { translations } = useTranslations();
  const [isExporting, setIsExporting] = useState(false);
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
      setRange([{ key: "selection" }]);
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

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <RateupLoader />
      ) : isError ? (
        <ErrorComponent refetch={refetch} isRefetching={isRefetching} />
      ) : (
        !npsOverView.length &&
        !choiceWiseOverView.length && (
          <NothingFound text={translations["No Data available for Analysis"]} />
        )
      )}
      {!flowId && (
        <SurveyStatsWebForm translations={translations} surveyId={surveyId} />
      )}
      <HappyIndex translations={translations} surveyId={surveyId} />
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
      <div ref={targetRef}>
        <SurveyQuestion
          choiceWise={choiceWiseOverView}
          NPS={npsOverView}
          flowQuestions={flowQuestions}
          questions={questions}
          version={version}
          surveyId={surveyId}
          defaultLanguage={defaultLanguage}
        />
      </div>
    </div>
  );
};

export default React.memo(ResultsOverviewWebForm);
