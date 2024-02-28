//import start
import { useContext, useState } from "react";
import { useRouter } from "next/router";
import { Badge, Divider, Flex, Group, Stack, Tabs, Text } from "@mantine/core";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import NothingFound from "../../NothingFound/NothingFound";
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
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import {
  IconAntennaBars4,
  IconChartPieFilled,
  IconChartRadar,
} from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { TeamWiseResponses } from "../../../backend/surveys/response/response.api";
import {
  getResponseArrayByQuestionType,
  getResponseObjectByQuestionType,
} from "../../../utils/response";
import SurveyContext from "../../../context/SurveyContext";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { getFilteredResponsesUsingTeam } from "../../../utils/team/surveyTeam";
import RateupLoader from "../../Loaders/RateupLoader";
//import end
//.............................................................................
// default export component start
export default function ResultComparison({ surveyId }: { surveyId: string }) {
  const { filterTeams, filterTags } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const {
    data: questions,
    isLoading: qLoading,
    error: qError,
  } = useQuestions(surveyId?.toString());
  const {
    data: teamWiseResponses,
    isLoading: rLoading,
    error: rError,
  } = useAllResponses(surveyId?.toString());

  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );

  if (qLoading || rLoading) return <RateupLoader h={"100dvh"} />;
  if (qError || rError) return <div>Error...</div>;
  if (teamWiseResponses?.length === 0)
    return <NothingFound text="No responses found for comparison" />;
  return (
    <PaperLayout
      p={5}
      miw={300}
      h={"100%"}
      display={"flex"}
      style={{ flexDirection: "column" }}
    >
      <Stack style={{ overflow: "auto", flex: 1 }} mt={"md"} p={10}>
        <Heading subtitle="Team Response Activity" />
        <TeamResponseActivitySection
          teamWiseResponses={filteredResponsesByTeam}
        />
        <Heading subtitle="Team Question Activity" />
        {questions?.map((q, i) => {
          if (questionTypesForComparison.includes(q?.type)) {
            let questionResponses = [];
            for (const teamResponse of filteredResponsesByTeam) {
              for (const surveyResponse of teamResponse?.responses) {
                if (
                  selectedLanguage &&
                  surveyResponse.language !== selectedLanguage
                ) {
                  continue;
                }
                if (
                  filterTags.length > 0 &&
                  filterTags.includes(surveyResponse?.tag)
                ) {
                  continue;
                }
                const questionResponse = surveyResponse?.responses?.find(
                  (response) => response.questionId === q.id,
                );
                if (questionResponse) {
                  questionResponses.push({
                    team: teamResponse.team,
                    response: questionResponse?.response[questionResponse.type],
                  });
                }
              }
            }
            return (
              <PaperLayout mih={500} key={i}>
                <Stack>
                  <Flex justify="space-between">
                    <Text c="dark.3" fw={900} w={"85%"}>
                      {
                        q.title[
                          selectedLanguage ? selectedLanguage : defaultLanguage
                        ]
                      }
                    </Text>
                    <Badge variant="dot">{q.type}</Badge>
                  </Flex>
                  <CombinedChart
                    questionResponses={questionResponses}
                    question={q}
                    teams={filteredResponsesByTeam?.map(({ team }) => team)}
                  />
                </Stack>
              </PaperLayout>
            );
          }
        })}
      </Stack>
    </PaperLayout>
  );
}

interface TeamResponseActivitySectionProps {
  teamWiseResponses: Array<TeamWiseResponses>;
}
const TeamResponseActivitySection = ({
  teamWiseResponses,
}: TeamResponseActivitySectionProps) => {
  enum ActivePlot {
    Radar = "radar",
    Bar = "bar",
    Pie = "pie",
  }
  const [activePlot, setActivePlot] = useState<ActivePlot>(ActivePlot.Bar);
  if (
    teamWiseResponses?.every((response) => response?._count.responses === 0)
  ) {
    return (
      <Stack mih={400}>
        <NothingFound text="No response activity yet" />
      </Stack>
    );
  } else {
    return (
      <Tabs
        defaultValue={activePlot}
        onChange={(value: ActivePlot) => setActivePlot(value)}
      >
        <Tabs.List>
          <Tabs.Tab value={ActivePlot.Bar} leftSection={<IconAntennaBars4 />}>
            Bar
          </Tabs.Tab>
          <Tabs.Tab value={ActivePlot.Pie} leftSection={<IconChartPieFilled />}>
            Pie
          </Tabs.Tab>
          <Tabs.Tab value={ActivePlot.Radar} leftSection={<IconChartRadar />}>
            Radar
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={ActivePlot.Bar}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={teamWiseResponses} margin={{ top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team.code" />
              <YAxis />
              <Bar
                dataKey="_count.responses"
                fill="#52ba66"
                maxBarSize={50}
                radius={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </Tabs.Panel>
        <Tabs.Panel value={ActivePlot.Pie}>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart height={400}>
              <Pie
                data={teamWiseResponses}
                dataKey="_count.responses"
                cx="50%"
                cy="50%"
                fill="#52ba66"
                label={(entry) => entry.team.code}
              />
            </PieChart>
          </ResponsiveContainer>
        </Tabs.Panel>
        <Tabs.Panel value={ActivePlot.Radar}>
          <ResponsiveContainer height={400}>
            <RadarChart height={400} data={teamWiseResponses}>
              <PolarGrid />
              <PolarAngleAxis dataKey="team.code" />
              <Radar
                name="Responses"
                dataKey="_count.responses"
                fill="#52ba66"
              />
            </RadarChart>
          </ResponsiveContainer>
        </Tabs.Panel>
      </Tabs>
    );
  }
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
  const data = teams.map(({ code, id }) => {
    const responses = getResponseObjectByQuestionType(question.type);
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
        <NothingFound text="No response activity for this question yet" />
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
          {getResponseArrayByQuestionType(question.type)?.map(
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
