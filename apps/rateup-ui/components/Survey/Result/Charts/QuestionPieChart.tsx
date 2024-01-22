import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Stack,
  Text,
  Group,
  Paper,
  Badge,
  RingProgress,
  Flex,
} from "@mantine/core";
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
              ( {!total ? 0 : ((myPayload?.value / total) * 100)?.toFixed(1)}% )
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
  csatScore: number;
}

const QuestionPieChart: React.FC<QuestionPieChartProps> = ({
  no,
  question,
  type,
  responseCount,
  data,
  csatScore,
}) => {
  const chartData = [
    { name: "Detractors", value: data?.detractors, color: "#FF5C55" },
    { name: "Passives", value: data?.passives, color: "#FEDC4E" },
    { name: "Promoters", value: data?.promoters, color: "#52BA66" },
  ];
  const cx = 150;
  const cy = 170;
  const iR = 70;
  const oR = 100;

  const getCSATColor = (score) => {
    if (score >= 90) {
      return { color: "green", message: "Excellent" };
    } else if (score >= 70) {
      return { color: "lime", message: "Good" };
    } else if (score >= 50) {
      return { color: "orange", message: "Fair" };
    } else if (score < 50) {
      return { color: "red", message: "Needs Improvement" };
    } else {
      return { color: "gray", message: "Neutral" };
    }
  };

  const getNPSScoreColor = (score) => {
    if (score < 0) {
      return { color: "red", message: "Needs Improvement" };
    } else if (score > 0) {
      return { color: "green", message: "Good" };
    } else {
      return { color: "gray", message: "Neutral" };
    }
  };

  return (
    <Stack miw={300}>
      <Flex justify="space-between">
        <Flex gap={"xs"} w={"85%"}>
          <Text fw={800} c={"dark.3"}>
            {no}.
          </Text>
          <Text fw={800} c={"dark.3"}>
            {question}
          </Text>
        </Flex>
        <Badge variant="dot">{type}</Badge>
      </Flex>
      <Group justify="space-evenly" align="center">
        <PaperLayout w={"fit-content"}>
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
        <Group align="center" gap={"sm"}>
          <Stack gap={0} align="center" w={250}>
            <RingProgress
              sections={[
                {
                  value: Math.abs(data?.score),
                  color: getNPSScoreColor(data?.score)?.color,
                },
              ]}
              label={
                <Text
                  c={getNPSScoreColor(data?.score)?.color}
                  fw={700}
                  ta="center"
                  size="xl"
                >
                  {Math.round(data?.score)} %
                </Text>
              }
            />
            <Text c="dimmed" fw={900} size="sm" ta="center">
              NPS Score
            </Text>
          </Stack>
          <Stack gap={0} align="center" w={250}>
            <RingProgress
              sections={[
                {
                  value: isNaN(csatScore) ? 0 : csatScore,
                  color: getCSATColor(csatScore)?.color,
                },
              ]}
              label={
                <Text
                  c={getCSATColor(csatScore)?.color}
                  fw={700}
                  ta="center"
                  size="xl"
                >
                  {isNaN(csatScore) ? 0 : csatScore} %
                </Text>
              }
            />
            <Text c="dimmed" fw={900} size="sm" ta="center">
              CSAT Score{" "}
              {isNaN(csatScore)
                ? null
                : `(${getCSATColor(csatScore)?.message})`}
            </Text>
          </Stack>
          <ResponsiveContainer height={280} width={300}>
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
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
        </Group>
      </Group>
    </Stack>
  );
};

export default QuestionPieChart;
