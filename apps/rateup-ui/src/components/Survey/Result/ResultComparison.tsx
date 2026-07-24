import { BarChart2, PieChart as PieChartIcon, Radar as RadarIcon } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useResponseCount,
  useResponseForComparison,
} from "@/backend/surveys/response/response.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { QuestionType2 } from "@/types/enums.ts";
import { getResponseArrayByQuestionType } from "@/utils/response.ts";

import RateupLoader from "../../Loaders/RateupLoader.tsx";
import NothingFound from "../../NothingFound/NothingFound.tsx";
import Heading from "../../styled/Heading/Heading.tsx";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util.tsx";

export default function ResultComparison({
  surveyId,
  version = 1,
  flowQuestions,
  questions,
}: {
  surveyId: string;
  version: number;
  flowQuestions: any[];
  questions;
}) {
  const { filterTeams } = useContext(SurveyContext);
  const { defaultLanguage } = useContext(SelectedLanguageContext);
  const allQuestions = version === 1 ? questions : flowQuestions;
  const { t: translations } = useTranslation();
  const {
    data: responseCountData,
    isPending: isPendingCount,
    isError: countError,
  } = useResponseCount(surveyId);
  const data = useMemo(
    () =>
      responseCountData
        ? responseCountData?.teamWiseCount?.map((t) => ({
            teamCode: t.teamCode,
            count: t.count,
          }))
        : [],
    [responseCountData],
  );

  const { data: teamWiseComparison, isPending } = useResponseForComparison(surveyId);

  if (isPendingCount || isPending) return <RateupLoader className="h-dvh" />;
  if (countError) return <div>Error...</div>;
  if (responseCountData?.all === 0)
    return <NothingFound text={translations("No responses found for comparison")} />;

  return (
    <Card className="min-w-[300px]">
      <CardContent className="flex flex-col gap-4 pt-6">
        <Heading subtitle={translations("Team Response Activity")} />
        <TeamResponseActivitySection data={data} />
        <Heading subtitle={translations("Team Question Activity")} />
        {teamWiseComparison?.map((q) => {
          const question = allQuestions.find((ques) => ques.id === q.questionId);
          if (!question) return null;
          const questionTitle =
            version === 1 ? question.title || question.label : question.header || question.label;
          const localizedTitle =
            typeof questionTitle === "object"
              ? getReplacedTitleFromVariable({
                  title: questionTitle[defaultLanguage],
                  surveyId,
                })
              : questionTitle;
          const graphData = filterTeams.length
            ? (q.data ?? []).filter((d) => filterTeams.includes(d.mapId))
            : (q.data ?? []);
          return (
            <Card key={q.questionId} className="min-h-[500px]">
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="w-[85%] font-black text-muted-foreground">{localizedTitle}</p>
                  <Badge variant="secondary">
                    {version === 1 ? question.type : QuestionType2[question.metaType]}
                  </Badge>
                </div>
                <ResponsiveContainer height={400}>
                  <BarChart data={graphData} margin={{ top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teamCode" />
                    <YAxis />
                    <Tooltip />
                    {Object.keys(q.data[0] ?? {})
                      .filter((key) => !["teamCode", "mapId"].includes(key))
                      .map((key) => (
                        <Bar
                          dataKey={key}
                          key={key}
                          stackId="a"
                          fill={
                            getResponseArrayByQuestionType(
                              version === 1 ? question.type : question?.metaType,
                            )?.find((j) => j.value.toString() === key)?.color
                          }
                          maxBarSize={50}
                          radius={10}
                          style={{ zIndex: 999, marginTop: 10, gap: 10 }}
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}

const TeamResponseActivitySection = ({ data }: { data: { teamCode: string; count: number }[] }) => {
  const { t: translations } = useTranslation();

  enum ActivePlot {
    Radar = "radar",
    Bar = "bar",
    Pie = "pie",
  }

  const [activePlot, setActivePlot] = useState<ActivePlot>(ActivePlot.Bar);

  return (
    <Tabs value={activePlot} onValueChange={(v) => setActivePlot(v as ActivePlot)}>
      <TabsList>
        <TabsTrigger value={ActivePlot.Bar}>
          <BarChart2 className="size-4" />
          {translations("Bar")}
        </TabsTrigger>
        <TabsTrigger value={ActivePlot.Pie}>
          <PieChartIcon className="size-4" />
          {translations("Pie")}
        </TabsTrigger>
        <TabsTrigger value={ActivePlot.Radar}>
          <RadarIcon className="size-4" />
          {translations("Radar")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={ActivePlot.Bar}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="teamCode" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#52ba66" maxBarSize={50} radius={10} />
          </BarChart>
        </ResponsiveContainer>
      </TabsContent>
      <TabsContent value={ActivePlot.Pie}>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart height={400}>
            <Pie
              data={data}
              dataKey="count"
              cx="50%"
              cy="50%"
              fill="#52ba66"
              label={({ index }) => data?.[index]?.teamCode}
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </TabsContent>
      <TabsContent value={ActivePlot.Radar}>
        <ResponsiveContainer height={400}>
          <RadarChart height={400} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="teamCode" />
            <Radar name="Responses" dataKey="count" fill="#52ba66" />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  );
};
