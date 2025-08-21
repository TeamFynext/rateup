//import start
import { useContext, useMemo, useState } from "react";

import { Badge, Divider, Flex, Group, Stack, Tabs, Text } from "@mantine/core";
import {
  IconAntennaBars4,
  IconChartPieFilled,
  IconChartRadar,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
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

import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import { TeamWiseResponses } from "../../../backend/surveys/response/response.api";
import {
  useAllResponses,
  useResponseAnalytics,
  useResponseCount,
  useResponseForComparison,
} from "../../../backend/surveys/response/response.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import { QuestionType, QuestionType2 } from "../../../types/enums";
import { getContent } from "../../../utils";
import {
  getResponseArrayByQuestionType,
  getResponseObjectByQuestionType,
} from "../../../utils/response";
import { getFilteredResponsesUsingTeam } from "../../../utils/team/surveyTeam";
import RateupLoader from "../../Loaders/RateupLoader";
import NothingFound from "../../NothingFound/NothingFound";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";

//import end
//.............................................................................
// default export component start
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
  const { filterTeams, filterTags } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const allQuestions = version === 1 ? questions : flowQuestions;
  const translations = useTranslations();
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

  const { data: teamWiseComparison, isPending } =
    useResponseForComparison(surveyId);

  if (isPendingCount || isPending) return <RateupLoader h={"100dvh"} />;
  if (countError) return <div>Error...</div>;
  if (responseCountData?.all === 0)
    return (
      <NothingFound text={translations("No responses found for comparison")} />
    );
  return (
    <PaperLayout
      p={5}
      miw={300}
      h={"100%"}
      display={"flex"}
      style={{ flexDirection: "column" }}
    >
      <Stack style={{ overflow: "auto", flex: 1 }} mt={"md"} p={10}>
        <Heading subtitle={translations("Team Response Activity")} />
        <TeamResponseActivitySection data={data} />
        <Heading subtitle={translations("Team Question Activity")} />
        {teamWiseComparison?.map((q, i) => {
          const question = allQuestions.find(
            (ques) => ques.id === q.questionId,
          );
          let questionTitle =
            version === 1
              ? question.title || question.label
              : question.header || question.label;
          let localizedTitle =
            typeof questionTitle === "object"
              ? getReplacedTitleFromVariable({
                  title: questionTitle[defaultLanguage],
                  surveyId,
                })
              : questionTitle;
          const graphData = filterTeams.length
            ? q.data.filter((d) => filterTeams.includes(d.mapId))
            : q.data;
          return (
            <PaperLayout mih={500} key={q.questionId}>
              <Stack>
                <Flex justify="space-between">
                  <Text c="dark.3" fw={900} w={"85%"}>
                    {localizedTitle}
                  </Text>
                  <Badge variant="dot">
                    {version === 1
                      ? question.type
                      : QuestionType2[question.metaType]}
                  </Badge>
                </Flex>
                <ResponsiveContainer height={400}>
                  <BarChart
                    data={graphData}
                    margin={{
                      top: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teamCode" />
                    <YAxis />
                    <Tooltip />
                    {Object.keys(q.data[0])
                      .filter((key) => !["teamCode", "mapId"].includes(key))
                      .map((key) => (
                        <Bar
                          dataKey={key}
                          key={key}
                          stackId="a"
                          fill={
                            getResponseArrayByQuestionType(
                              version === 1
                                ? question.type
                                : question?.metaType,
                            )?.find((j) => j.value.toString() === key).color
                          }
                          maxBarSize={50}
                          radius={10}
                          style={{ zIndex: 999, marginTop: 10, gap: 10 }}
                        />
                      ))}
                  </BarChart>
                </ResponsiveContainer>
              </Stack>
            </PaperLayout>
          );
        })}
      </Stack>
    </PaperLayout>
  );
}

const TeamResponseActivitySection = ({
  data,
}: {
  data: { teamCode: string; count: number }[];
}) => {
  const translations = useTranslations();

  enum ActivePlot {
    Radar = "radar",
    Bar = "bar",
    Pie = "pie",
  }
  const [activePlot, setActivePlot] = useState<ActivePlot>(ActivePlot.Bar);

  return (
    <Tabs
      defaultValue={activePlot}
      onChange={(value: ActivePlot) => setActivePlot(value)}
    >
      <Tabs.List>
        <Tabs.Tab value={ActivePlot.Bar} leftSection={<IconAntennaBars4 />}>
          {translations("Bar")}
        </Tabs.Tab>
        <Tabs.Tab value={ActivePlot.Pie} leftSection={<IconChartPieFilled />}>
          {translations("Pie")}
        </Tabs.Tab>
        <Tabs.Tab value={ActivePlot.Radar} leftSection={<IconChartRadar />}>
          {translations("Radar")}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={ActivePlot.Bar}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="teamCode" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#52ba66" maxBarSize={50} radius={10} />
          </BarChart>
        </ResponsiveContainer>
      </Tabs.Panel>
      <Tabs.Panel value={ActivePlot.Pie}>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart height={400}>
            <Pie
              data={data}
              dataKey="count"
              cx="50%"
              cy="50%"
              fill="#52ba66"
              label={(entry) => entry.teamCode}
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Tabs.Panel>
      <Tabs.Panel value={ActivePlot.Radar}>
        <ResponsiveContainer height={400}>
          <RadarChart height={400} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="teamCode" />
            <Radar name="Responses" dataKey="count" fill="#52ba66" />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Tabs.Panel>
    </Tabs>
  );
};
const questionTypesForComparison = [
  QuestionType.Rating,
  QuestionType.Opinion,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.CustomNPS,
];
interface CombinedChartProps {
  questionResponses: Array<{
    team: { name: string; code: string; id: string };
    response: any;
  }>;
  question: Question;
  teams: Array<{ name: string; code: string; id: string }>;
}
const CombinedChart = ({
  teams,
  questionResponses,
  question,
}: CombinedChartProps) => {
  const translations = useTranslations();
  const data = teams.map(({ code, id }) => {
    const responses = getResponseObjectByQuestionType(
      question.type as QuestionType,
    );
    questionResponses
      ?.filter((response) => response.team.id === id)
      ?.map(({ response }) =>
        question?.type === QuestionType.CustomNPS
          ? (responses[response?.weightage] =
              responses[response?.weightage] + 1)
          : (responses[response] = responses[response] + 1),
      );
    return {
      name: code,
      responses,
    };
  });
  if (data?.every((d) => Object.values(d.responses)?.every((r) => r === 0))) {
    return (
      <Stack h={400}>
        <NothingFound
          text={translations("No response activity for this question yet")}
        />
      </Stack>
    );
  } else {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20 }}
          barGap={5}
          barCategoryGap={20}
          style={{ stroke: "#fff", strokeWidth: 1.5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          {getResponseArrayByQuestionType(question.type as QuestionType)?.map(
            ({ color, value }, index) => (
              <Bar
                dataKey={`responses['${value}']`}
                stackId={"a"}
                fill={color}
                maxBarSize={50}
                radius={10}
                style={{ zIndex: 999, marginTop: 10, gap: 10 }}
                key={index}
              />
            ),
          )}
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomToolTip active={active} payload={payload} label={label} />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }
};

function CustomToolTip({ active, payload, label }) {
  if (active) {
    return (
      <PaperLayout>
        <Stack gap={2}>
          <Text fw={900}>{label}</Text>
          {payload?.map(({ name, value }) => (
            <>
              <Group justify="space-between">
                <Text>{name?.split("'")[1]}:</Text>
                <Badge miw={50}>{value}</Badge>
              </Group>
              <Divider variant="dotted" />
            </>
          ))}
        </Stack>
      </PaperLayout>
    );
  }
}
