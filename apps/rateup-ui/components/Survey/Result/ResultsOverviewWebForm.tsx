"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

import { Flex } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { QuestionType, WaQuestions } from "@/types/enums";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useAllResponseNPSForGraph } from "@/backend/surveys/surveys.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import OverallResponseGraphWebForm from "@/components/Graph/OverallResponseGraphWebForm";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import NothingFound from "@/components/NothingFound/NothingFound";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import { useResponseAnalytics } from "../../../backend/surveys/response/response.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import HappyIndex from "./HappyIndex";
import LargeTextResponseSummary from "./LargeTextResponseSummary";
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
  const translations = useTranslations();
  const [isExporting, setIsExporting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!targetRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(targetRef.current, {
        useCORS: true,
        logging: false,
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let y = 0;
      let page = 0;
      while (y < imgHeight) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, margin - y, pageWidth, imgHeight);
        y += pageHeight;
        page++;
      }
      pdf.save(`survey-analytics-${surveyId}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setIsExporting(false);
    }
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
      {!flowId && (
        <SurveyStatsWebForm translations={translations} surveyId={surveyId} />
      )}
      <PaperLayout p={"md"}>
        <Flex justify={"space-between"}>
          <RateupButtonPrimary
            onClick={handleExport}
            loading={isExporting}
            leftIcon={<IconTableExport size={"1rem"} />}
            title="Export to Pdf"
          />
          <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
        </Flex>
      </PaperLayout>
      <div ref={targetRef} className="flex flex-col gap-6">
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
