"use client";

import React, { useContext } from "react";

import { Badge, Flex, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useExtracted } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import {
  QuestionType,
  QuestionType2,
  WaQuestions,
} from "../../../../types/enums";
import { getContent } from "../../../../utils";
import { getResponseArrayByQuestionType } from "../../../../utils/response";
import Heading from "../../../styled/Heading/Heading";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import SurveySummaryNew from "../SurveySummaryNew";
import WaSummary from "../WaSummary";

interface QuestionBarChartProps {
  question: string;
  data: any[];
  questionType: QuestionType | WaQuestions;
  no: number;
  responseCount: number;
  version?: number;
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
  const translations = useExtracted();
  if (active && payload && payload.length) {
    return (
      <Paper
        p="lg"
        shadow="xl"
        style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
      >
        <Stack>
          <Title order={5}> {label} </Title>
          <Text>
            {translations("Count: ")}
            {payload[0]?.value}
          </Text>
        </Stack>
      </Paper>
    );
  }
  return null;
};

const getChoiceCountsforAll = (
  response,
  choicesInAllLang: Question["choices"],
  index,
) => {
  let languages: Array<Choice[]> = Object.values(choicesInAllLang);
  if (Array.isArray(response)) {
    return response?.some((r) => {
      let choiceIndex = null;
      for (var i = 0; i < languages?.length; i++) {
        choiceIndex = languages[i]?.findIndex((c) => c.value == r.value);
        if (choiceIndex == -1) continue;
        break;
      }
      return choiceIndex == index;
    });
  } else {
    let choiceIndex = null;
    for (var i = 0; i < languages?.length; i++) {
      choiceIndex = languages[i]?.findIndex((c) => c.value == response?.value);
      if (choiceIndex == -1) continue;
      break;
    }
    return choiceIndex == index;
  }
};

const QuestionBarChart: React.FC<QuestionBarChartProps> = ({
  question,
  data,
  questionType,
  no,
  responseCount,
  version = 1,
}) => {
  const translations = useExtracted();

  return (
    <Stack miw={300}>
      <Flex justify="space-between">
        <Flex gap={"xs"} w={"85%"}>
          <Text fw={800} c={"dark.3"}>
            {" "}
            {no}
          </Text>
          <Text fw={800} c={"dark.3"}>
            {getContent(question)}
          </Text>
        </Flex>
        {questionType !== QuestionType.MCQGrid && (
          <Badge variant="dot">{questionType}</Badge>
        )}
      </Flex>
      <Group align="center" justify="center">
        <Stack style={{ flex: 1 }} align="center">
          <PaperLayout miw={200} maw={230}>
            <Stack align="center" gap={10}>
              <Heading
                title={`${responseCount}`}
                titleprops={{ w: "fit-content" }}
              />
              <Text c={"dimmed"} fw={900} size="sm">
                {translations("Responses")}
              </Text>
            </Stack>
          </PaperLayout>
          <SurveySummaryNew
            totalResponses={responseCount}
            questionType={questionType}
            choiceCounts={data}
            version={version}
          />
        </Stack>
        <Stack style={{ flex: 1 }} align="center">
          <Stack miw={300} align="center">
            <BarChart
              width={500}
              height={300}
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              maxBarSize={50}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="choice" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="count" fill="#fff" radius={10} isAnimationActive />
            </BarChart>
          </Stack>
        </Stack>
      </Group>
    </Stack>
  );
};

export default QuestionBarChart;

export const QuestionBarChart2 = ({
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
  const translations = useExtracted();
  const choiceCounts = choicesToUse?.map((choice) => ({
    name: choice?.label,
    count: data?.filter((item) =>
      Array.isArray(item?.response)
        ? item?.response?.includes(choice?.value)
        : item?.response === choice?.value,
    )?.length,
    fill: choice?.color,
  }));
  return (
    <Stack miw={300}>
      <Flex justify="space-between">
        <Flex gap={"xs"} w={"85%"}>
          <Text fw={800} c={"dark.3"}>
            {no}.{" "}
          </Text>
          <Text fw={800} c={"dark.3"}>
            {getContent(question)}
          </Text>
        </Flex>
        <Badge variant="dot">{QuestionType2[questionType]}</Badge>
      </Flex>
      <Group align="center" justify="center">
        <Stack style={{ flex: 1 }} align="center">
          <PaperLayout miw={200} maw={230}>
            <Stack align="center" gap={10}>
              <Heading
                title={`${data?.length}`}
                titleprops={{ w: "fit-content" }}
              />
              <Text c={"dimmed"} fw={900} size="sm">
                {translations("Responses")}
              </Text>
            </Stack>
          </PaperLayout>
          <WaSummary
            response={data}
            questionType={questionType}
            choiceCounts={choiceCounts}
          />
        </Stack>
        <Stack style={{ flex: 1 }} align="center">
          <Stack miw={300} align="center">
            <BarChart
              width={600}
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
        </Stack>
      </Group>
    </Stack>
  );
};
