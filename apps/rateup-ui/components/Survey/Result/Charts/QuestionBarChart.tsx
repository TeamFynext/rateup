import React, { useContext } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Paper, Text, Group, Stack, Title, Badge, Flex } from "@mantine/core";
import { QuestionType } from "../../../../types/enums";
import { getResponseArrayByQuestionType } from "../../../../utils/response";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import Heading from "../../../styled/Heading/Heading";
import { ChoiceTypeQuestions } from "../../../../utils/constants";
import SurveySummaryNew from "../SurveySummaryNew";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
interface QuestionBarChartProps {
  question: string;
  data: any[];
  choices: any[];
  questionType: QuestionType;
  no: number;
  choicesInAllLang: Question["choices"];
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

const getChoiceCountsforAll = (
  response,
  choicesInAllLang: Question["choices"],
  index,
) => {
  let languages: Array<Choice[]> = Object.values(choicesInAllLang);
  if (Array.isArray(response)) {
    return response.some((r) => {
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
      choiceIndex = languages[i]?.findIndex((c) => c.value == response.value);
      if (choiceIndex == -1) continue;
      break;
    }
    return choiceIndex == index;
  }
};

const QuestionBarChart: React.FC<QuestionBarChartProps> = ({
  question,
  choices,
  data,
  questionType,
  no,
  choicesInAllLang,
}) => {
  let choicesToUse = choices;
  if (!choicesToUse) {
    if (getResponseArrayByQuestionType(questionType)) {
      choicesToUse = getResponseArrayByQuestionType(questionType);
    }
  }
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  let choiceCounts = choicesToUse?.map((choice, index) => ({
    name: choice?.value,
    count: data?.filter((item) => {
      const response = item?.response[questionType];
      if (ChoiceTypeQuestions.includes(questionType)) {
        if (selectedLanguage) {
          return Array.isArray(response)
            ? response?.some((r) => r.value === choice?.value)
            : response?.value === choice?.value;
        } else {
          return getChoiceCountsforAll(response, choicesInAllLang, index);
        }
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
      <Flex justify="space-between">
        <Flex gap={"xs"} w={"85%"}>
          <Text fw={800} c={"dark.3"}>
            {" "}
            {no}.{" "}
          </Text>
          <Text fw={800} c={"dark.3"}>
            {question}
          </Text>
        </Flex>
        <Badge variant="dot">{questionType}</Badge>
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
                Responses
              </Text>
            </Stack>
          </PaperLayout>
          <SurveySummaryNew
            response={data}
            questionType={questionType}
            choices={choices}
            choiceCounts={choiceCounts}
          />
        </Stack>
        <Stack style={{ flex: 1 }} align="center">
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
        </Stack>
      </Group>
    </Stack>
  );
};

export default QuestionBarChart;
