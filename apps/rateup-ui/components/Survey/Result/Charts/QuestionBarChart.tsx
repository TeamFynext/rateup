import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Paper,
  Text,
  Group,
  Stack,
  Title,
  Badge,
  Grid,
  SimpleGrid,
} from "@mantine/core";
import { QuestionType } from "../../../../types/enums";
import { getResponseArrayByQuestionType } from "../../../../utils/response";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import Heading from "../../../styled/Heading/Heading";
import { ChoiceTypeQuestions } from "../../../../utils/constants";
import SurveySummaryNew from "../SurveySummaryNew";
interface QuestionBarChartProps {
  question: string;
  data: any[];
  choices: any[];
  questionType: QuestionType;
  no: number;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
}
export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <Paper
        p="lg"
        shadow="xl"
        style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
      >
        <Stack>
          <Title order={5}> {label} </Title>
          <Text>Count: {payload[0]?.value}</Text>
        </Stack>
      </Paper>
    );
  }
  return null;
};

const QuestionBarChart: React.FC<QuestionBarChartProps> = ({
  question,
  choices,
  data,
  questionType,
  no,
}) => {
  let choicesToUse = choices;
  if (!choicesToUse) {
    if (getResponseArrayByQuestionType(questionType)) {
      choicesToUse = getResponseArrayByQuestionType(questionType);
    }
  }
  const choiceCounts = choicesToUse?.map((choice) => ({
    name: choice?.value,
    count: data?.filter((item) => {
      const response = item?.response[questionType];
      if (ChoiceTypeQuestions.includes(questionType)) {
        return Array.isArray(response)
          ? response?.some((r) => r.value === choice?.value)
          : response?.value === choice?.value;
      } else {
        return Array.isArray(response)
          ? response.includes(choice?.value)
          : response === choice?.value;
      }
    })?.length,
    fill: choice?.color,
  }));
  return (
    <Stack miw={300}>
      <Group justify="space-between">
        <Text size="xl" fw={800} maw={300} truncate c={"dark.3"}>
          {no}. {question}
        </Text>
        <Badge variant="dot">{questionType}</Badge>
      </Group>
      <Grid justify="space-evenly" align="center">
        <Grid.Col span={"content"}>
          <SimpleGrid cols={1}>
            <PaperLayout>
              <Stack align="center" gap={10}>
                <Heading
                  title={`${data?.length}`}
                  titleprops={{ w: "fit-content" }}
                />
                <Text c={"dimmed"} fw={900} size="sm">
                  Responses
                </Text>
              </Stack>
            </PaperLayout>
            <SurveySummaryNew
              response={data}
              questionType={questionType}
              choices={choices}
            />
          </SimpleGrid>
        </Grid.Col>
        <Grid.Col span={"content"}>
          <Stack miw={300} align="center">
            <BarChart
              width={500}
              height={300}
              data={choiceCounts}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              maxBarSize={50}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="count" fill="#fff" radius={10} isAnimationActive />
            </BarChart>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

export default QuestionBarChart;
