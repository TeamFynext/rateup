import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconTableExport } from "@tabler/icons-react";
import dayjs from "dayjs";
import { Range } from "react-date-range";

import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";
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
import QuestionBarChart from "./Charts/QuestionBarChart";
import QuestionPieChart from "./Charts/QuestionPieChart";
import HappyIndex from "./HappyIndex";
import LargeTextResponseSummary from "./LargeTextResponseSummary";
import styles from "./ResultsOverview.module.css";
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
  const { data: subscription } = useSubscription();

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

  const { data: stats, isLoading, isFetching } = useHappyIndex(surveyId);

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
    <div className="flex flex-col gap-6">
      <SurveyStats1 translations={translations} surveyId={surveyId} />
      <HappyIndex translations={translations} surveyId={surveyId} />
    </div>
  );
};

export default React.memo(ResultsOverview1);
