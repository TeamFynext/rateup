import { useEffect, useState } from "react";

import { Group, PaperProps, Select, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import weekofyear from "dayjs/plugin/weekOfYear";
import {
  Bar,
  BarChart,
  Brush,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import useTranslations from "@/dictionaries/useTranslation";

import { SentimentClass } from "../../../types/enums";
import {
  groupDataByTimeIntervals,
  TIME_INTERVALS,
} from "../../../utils/reputationManagement/rm.data.util";
import { getSentimentClass } from "../../../utils/reputationManagement/sentiment.util";
import PaperLayout from "../../styled/Layouts/PaperLayout";

dayjs.extend(weekofyear);

interface SentimentOverTimeProps {
  sentimentOverTime: {
    [date: string]: Array<number>;
    // YYYY-MM-DD: Array<sentimentScore>
  };
}
interface graphDataUnit {
  name: string; //x
  positive: number;
  neutral: number;
  negative: number;
}

export const sentimentColorMap = {
  [SentimentClass.POSITIVE]: "#7FE47E",
  [SentimentClass.NEUTRAL]: "#FFEB3A",
  [SentimentClass.NEGATIVE]: "#FF718B",
};
export function SentimentOverTime({
  sentimentOverTime,
  ...props
}: SentimentOverTimeProps & PaperProps) {
  const [timeInterval, setTimeInterval] = useState(TIME_INTERVALS.Yearly);
  const { translations } = useTranslations();
  const sortedDates = Object.keys(sentimentOverTime).sort(
    (a, b) => dayjs(a).unix() - dayjs(b).unix(),
  );
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const [brushStartIndex, setBrushStartIndex] = useState(0);

  const graphDataByTimeIntervals = groupDataByTimeIntervals(
    timeInterval,
    sentimentOverTime,
    firstDate,
    lastDate,
  );

  const graphData: Array<graphDataUnit> = Object.keys(
    graphDataByTimeIntervals,
  ).map((k) => ({
    name: k,
    positive: graphDataByTimeIntervals[k].filter(
      (score) => getSentimentClass(score) === SentimentClass.POSITIVE,
    ).length,
    neutral: graphDataByTimeIntervals[k].filter(
      (score) => getSentimentClass(score) === SentimentClass.NEUTRAL,
    ).length,
    negative: graphDataByTimeIntervals[k].filter(
      (score) => getSentimentClass(score) === SentimentClass.NEGATIVE,
    ).length,
  }));
  useEffect(() => {
    const newStartIndex = graphData.length - 50 > 0 ? graphData.length - 50 : 0;
    if (brushStartIndex !== newStartIndex) {
      setBrushStartIndex(newStartIndex);
    }
  }, [timeInterval]);

  return (
    <PaperLayout {...props}>
      <Stack>
        <Group justify="space-between">
          <Text
            style={{
              fontSize: "16px",
              fontWeight: 600,
            }}
            c="#666"
          >
            {translations["Sentiment Over Time"]}
          </Text>
          <Select
            allowDeselect={false}
            value={timeInterval}
            onChange={setTimeInterval as any}
            data={Object.values(TIME_INTERVALS)}
          />
        </Group>
        <div
          onWheel={(e) => {
            // TODO: prevent scrolling page when mouse is over graph
            return;
            e.stopPropagation();
            e.preventDefault();
            let newIndex = brushStartIndex;
            if (e.deltaY < 0) {
              newIndex = brushStartIndex + Math.floor(graphData.length / 10);
            } else {
              newIndex = brushStartIndex - Math.floor(graphData.length / 10);
            }

            if (newIndex < graphData.length && newIndex >= 0) {
              setBrushStartIndex(newIndex);
            }
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graphData}>
              <XAxis dataKey="name" />
              <YAxis />
              <RTooltip />
              <Legend />
              <Bar
                stackId={"a"}
                dataKey="positive"
                fill={sentimentColorMap[SentimentClass.POSITIVE]}
              />
              <Bar
                stackId={"a"}
                dataKey="neutral"
                fill={sentimentColorMap[SentimentClass.NEUTRAL]}
              />
              <Bar
                stackId={"a"}
                dataKey="negative"
                fill={sentimentColorMap[SentimentClass.NEGATIVE]}
              />
              <Brush
                dataKey="name"
                height={30}
                stroke="#8884d8"
                startIndex={brushStartIndex}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Stack>
    </PaperLayout>
  );
}
