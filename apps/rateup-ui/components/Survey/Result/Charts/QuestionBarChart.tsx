import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Paper, Text, Group, Stack, Title, useMantineTheme} from '@mantine/core';
import { QuestionType } from '../../../../types/enums';

interface QuestionBarChartProps {
  question: string;
  data: any[];
  choices: any[];
  questionType: QuestionType;
  no: number
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  const theme = useMantineTheme();
  const transparentWhite = theme.fn.rgba(theme.white, 0.9);

  if (active && payload && payload.length) {
    return (
      <Paper p="lg" shadow='xl'  style={{ backgroundColor: transparentWhite }}>
        <Stack>
          <Title order={5}> {label} </Title>
          <Text>Count: { payload[0].value}</Text>
        </Stack>
      </Paper>
    );
  }

  return null;
};

const QuestionBarChart: React.FC<QuestionBarChartProps> = ({ question, choices, data, questionType, no }) => {

  const COLORS = ['#64D29D', '#CB4754', '#F7B583', '#118AB2', '#4160AB'];

  let choicesToUse = choices;

  if (!choicesToUse) {

    if (questionType === QuestionType.LD) {
      choicesToUse = ['Like', 'Dislike'];
    } else if (questionType === QuestionType.YN) {
      choicesToUse = ['Yes', 'No'];
    } else if (questionType === QuestionType.Rating) {
      choicesToUse = [1, 2, 3, 4, 5];
    } else if (questionType === QuestionType.Smiley) {
      choicesToUse = ['Happy', 'VeryHappy', 'Sad', 'Neutral', 'VerySad'];
    }else if (questionType === QuestionType.Opinion) {
      choicesToUse = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
    else{    
    if (questionType === QuestionType.MSQ) {
      choicesToUse = Array.from(new Set(data.flatMap(item => item.response[QuestionType.MSQ])));
    } else if (questionType === QuestionType.DDSS) {
      choicesToUse = Array.from(new Set(data.flatMap(item => item.response[QuestionType.DDSS])));
    } else if (questionType === QuestionType.DDMS) {
      choicesToUse = Array.from(new Set(data.flatMap(item => item.response[QuestionType.DDMS])));
    }
  }
  }

  const choiceCounts = choicesToUse?.map((choice, index) => ({
    name: choice,
    count: data.filter(item => {
      const response = item.response[questionType];
      return Array.isArray(response) ? response.includes(choice) : response === choice;
    }).length,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Paper p="md" shadow="xs" style={{ marginBottom: '20px' }}>
      <Group>
        <Stack ml="xl" sx={{minWidth: "350px", maxWidth: "350px"}}>
          <Text size="xl">{no}. {question}</Text>

          <Stack ml="xl" pt="sm">
                <Text size="md" color="gray" mt="xl"> {questionType}</Text>
                <Text size="md" color="gray">{data.length} responses</Text>
             </Stack>
        </Stack>

        <Stack  sx={{minWidth: "500px"}}>
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
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="count" fill="#fff" />
        </BarChart>
        </Stack>
      </Group>

    </Paper>
  );
};

export default QuestionBarChart;