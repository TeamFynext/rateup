import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge, Divider, Flex, Stack, Text } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Range } from "react-date-range";

import { useSubscription } from "@/backend/subscription/subscription.query";
import {
  useAllResponseForGraph,
  useAllResponseNPSForGraph,
} from "@/backend/surveys/surveys.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";
import OverallResponseGraph1 from "@/components/Graph/OverallResponseGraph1";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import useTranslations from "@/dictionaries/useTranslation";

import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import {
  useHappyIndex,
  useResponseAnalytics,
  useSurveyHappyResponseAnalytics,
} from "../../../backend/surveys/response/response.query";
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
import QuestionBarChart1 from "./Charts/QuestionBarChart1";
import QuestionPieChart from "./Charts/QuestionPieChart";
import HappyIndex from "./HappyIndex";
import LargeTextResponseSummary from "./LargeTextResponseSummary";
import styles from "./ResultsOverview.module.css";
import SurveyQuestion from "./SurveyQuestion";
import { ResponseGraphBySurvey, SurveyResponseStats } from "./SurveyStats";
import SurveyStats1 from "./SurveyStats1";

const ResultsOverview1 = ({
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
  const contentDivRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const handleExportToPdf = useCallback(async () => {
    const reactToPdf = await import("react-to-pdf");
    const generatePDF = reactToPdf.default;
    const options = {
      page: {
        // margin is in MM, default is Margin.NONE = 0
        margin: reactToPdf.Margin.MEDIUM,
      },
    };
    if (contentDivRef.current) {
      setIsExporting(true);
      await generatePDF(contentDivRef, options);
      setIsExporting(false);
    }
  }, [contentDivRef]);

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

  return (
    <div className="flex flex-col gap-6">
      {!flowId && (
        <SurveyStats1 translations={translations} surveyId={surveyId} />
      )}
      <HappyIndex translations={translations} surveyId={surveyId} />
      <OverallResponseGraph1
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
    </div>
  );
};

export default React.memo(ResultsOverview1);
