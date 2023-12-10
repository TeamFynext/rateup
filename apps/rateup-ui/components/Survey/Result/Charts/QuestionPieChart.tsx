import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Stack, Text, Group, Paper, Badge } from "@mantine/core";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import Heading from "../../../styled/Heading/Heading";
interface DataItem {
  name: string;
  value: number;
  total: number;
}
enum NPSEntities {
  promoters = "Promoters",
  detractors = "Detractors",
  passives = "Passives",
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DataItem }>;
  total?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  total,
}) => {
  if (active && payload && payload?.length) {
    const data = payload[0]?.payload;
    const percentage = ((data?.value / total) * 100)?.toFixed(2);
    return (
      <Paper
        px="sm"
        shadow="xl"
        style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
      >
        <p>{`${data?.name}: ${data?.value} (${percentage}%)`}</p>
      </Paper>
    );
  }
  return null;
};

const CustomLegend: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  total,
}) => {
  function returnColor(name: string): string {
    if (name === NPSEntities.promoters) {
      return "#52BA66";
    } else if (name === NPSEntities.detractors) {
      return "#FF5C55";
    } else if (name === NPSEntities.passives) {
      return "#FEDC4E";
    }
  }
  return (
    <Group style={{ transform: "translateY(10px)" }}>
      {payload?.map((entry) => {
        const { payload: myPayload } = entry;
        return (
          <Stack style={{ flex: 1 }} gap={0} align="center">
            <Text c={returnColor(myPayload?.name)} fw={900}>
              {myPayload?.value}
            </Text>
            <Text c={returnColor(myPayload?.name)} fw={900}>
              ( {((myPayload?.value / total) * 100)?.toFixed(1)}% )
            </Text>
            <Text size="xs" fw={"bolder"}>
              {myPayload?.name}
            </Text>
          </Stack>
        );
      })}
    </Group>
  );
};

interface QuestionPieChartProps {
  question: string;
  type: string;
  data: any;
  responseCount: number;
  no: number;
}

const QuestionPieChart: React.FC<QuestionPieChartProps> = ({
  no,
  question,
  type,
  responseCount,
  data,
}) => {
  const chartData = [
    { name: "Detractors", value: data?.detractors, color: "#FF5C55" },
    { name: "Passives", value: data?.passives, color: "#FEDC4E" },
    { name: "Promoters", value: data?.promoters, color: "#52BA66" },
  ];
  const cx = 150;
  const cy = 200;
  const iR = 70;
  const oR = 100;

  return (
    <Stack miw={300}>
      <Group justify="space-between">
        <Text size="xl" fw={800} maw={300} truncate c={"dark.3"}>
          {no}. {question}
        </Text>
        <Badge variant="dot">{type}</Badge>
      </Group>
      <Group justify="center">
        <Stack style={{ flex: 1 }} align="center">
          <PaperLayout miw={200} maw={230}>
            <Stack align="center">
              <Heading
                title={`${responseCount}`}
                titleprops={{ w: "fit-content" }}
              />
              <Text c={"dimmed"} fw={900} size="sm">
                Responses
              </Text>
            </Stack>
          </PaperLayout>
          <PaperLayout miw={200} maw={230}>
            <Stack align="center">
              <Heading
                title={`${data?.score?.toFixed(2) ?? 0}`}
                titleprops={{ w: "fit-content" }}
              />
              <Text c={"dimmed"} fw={900} size="sm">
                NPS Score
              </Text>
            </Stack>
          </PaperLayout>
        </Stack>
        <Stack style={{ flex: 1 }} align="center" justify="center">
          <ResponsiveContainer height={280} width={300}>
            <PieChart>
              <Pie
                dataKey="value"
                startAngle={180}
                endAngle={0}
                data={chartData}
                cx={cx}
                cy={cy}
                innerRadius={iR}
                outerRadius={oR}
                fill="#8884d8"
                stroke="#fff"
              >
                {chartData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color} radius={10} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={data?.total} />} />
              <Legend content={<CustomLegend total={data?.total} />} />
            </PieChart>
          </ResponsiveContainer>
        </Stack>
      </Group>
    </Stack>
  );
};

export default QuestionPieChart;
