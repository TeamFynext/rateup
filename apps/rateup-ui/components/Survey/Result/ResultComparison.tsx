//import start
import { useState } from "react";
import { useRouter } from "next/router";
import {
  Badge,
  Divider,
  Flex,
  Group,
  MultiSelect,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useSurvey } from "../../../backend/surveys/surveys.query";
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
import {
  LDResponse,
  QuestionType,
  SmileyResponse,
  YNResponse,
} from "../../../types/enums";
import { TeamWiseResponses } from "../../../backend/surveys/response/response.api";
import {
  getResponseArrayByQuestionType,
  getResponseObjectByQuestionType,
} from "../../../utils/response";
//import end
//.............................................................................
// default export component start
export default function ResultComparison() {
  const [filterTeams, setFilterTeams] = useState([]);
  const {
    query: { surveyId },
  } = useRouter();
  const {
    data: survey,
    isLoading: sLoading,
    error: sError,
  } = useSurvey(surveyId?.toString());
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

  const multiSelectOptions = survey?.teams?.map((team) => {
    return { value: team?.mapId, label: team?.name };
  });

  function getFilteredResponses() {
    if (filterTeams.length > 0) {
      return teamWiseResponses?.filter((response) =>
        filterTeams.includes(response?.id),
      );
    } else {
      return teamWiseResponses;
    }
  }
  const filteredResponses = getFilteredResponses();

  if (sLoading || qLoading || rLoading) return <div>Loading...</div>;
  if (sError || qError || rError) return <div>Error...</div>;
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
      <>
        <MultiSelect
          data={multiSelectOptions}
          pos={"sticky"}
          top={0}
          onChange={setFilterTeams}
          placeholder={filterTeams.length > 0 ? "" : "All Teams"}
        />
        <Stack style={{ overflow: "auto", flex: 1 }} mt={"md"} p={10}>
          <Heading subtitle="Team Response Activity" />
          <TeamResponseActivitySection
            teamWiseResponses={getFilteredResponses()}
          />
          <Heading subtitle="Team Question Activity" />
          {questions?.map((q) => {
            if (questionTypesForComparison.includes(q?.type)) {
              let questionResponses = [];
              for (const teamResponse of filteredResponses) {
                for (const surveyResponse of teamResponse.responses) {
                  const questionResponse = surveyResponse.responses.find(
                    (response) => response.questionId === q.id,
                  );
                  if (questionResponse) {
                    questionResponses.push({
                      team: teamResponse.team,
                      response:
                        questionResponse.response[questionResponse.type],
                    });
                  }
                }
              }
              return (
                <PaperLayout mih={500}>
                  <Stack>
                    <Group justify="space-between">
                      <Text c="dimmed" fw={900}>
                        {q.title["English"]}
                      </Text>
                      <Badge variant="dot">{q.type}</Badge>
                    </Group>
                    <CombinedChart
                      questionResponses={questionResponses}
                      question={q}
                      teams={getFilteredResponses().map(({ team }) => team)}
                    />
                  </Stack>
                </PaperLayout>
              );
            }
          })}
        </Stack>
      </>
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
  if (teamWiseResponses?.every((response) => response._count.responses === 0)) {
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
                fill="var(--tertiary-color)"
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
                fill="var(--tertiary-color)"
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
                fill="var(--tertiary-color)"
                fillOpacity={0.7}
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
      .filter((response) => response.team.id === id)
      .map(({ response }) => (responses[response] = responses[response] + 1));
    return {
      name: code,
      responses,
    };
  });
  function returnAlpha(response) {
    console.log(response);
    const length = getResponseArrayByQuestionType(question.type).length;
    switch (length) {
      case 2: {
        switch (response) {
          case LDResponse.Like: {
            return 1;
          }
          case YNResponse.Yes: {
            return 1;
          }
          default: {
            return 0.5;
          }
        }
      }
      case 5: {
        switch (response) {
          case SmileyResponse.VerySad: {
            return 0.2;
          }
          case SmileyResponse.Sad: {
            return 0.4;
          }
          case SmileyResponse.Neutral: {
            return 0.6;
          }
          case SmileyResponse.Happy: {
            return 0.8;
          }
          case SmileyResponse.VeryHappy: {
            return 1;
          }
          default: {
            return response * 0.2;
          }
        }
      }
      case 10: {
        return response * 0.1;
      }
    }
  }
  if (data.every((d) => Object.values(d.responses).every((r) => r === 0))) {
    return (
      <Stack h={400}>
        <NothingFound text="No response activity for this question yet" />
      </Stack>
    );
  } else {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          {console.log(getResponseArrayByQuestionType(question.type))}
          {getResponseArrayByQuestionType(question.type).map(
            (response: number | string) => (
              <Bar
                dataKey={`responses['${response}']`}
                fill={`rgba(28, 81, 142,${returnAlpha(response)})`}
                maxBarSize={50}
                radius={10}
                style={{ zIndex: 999 }}
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
