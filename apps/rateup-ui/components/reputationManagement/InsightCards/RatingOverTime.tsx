import { useEffect, useState } from "react";

import { Group, PaperProps, Select, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import weekofyear from "dayjs/plugin/weekOfYear";
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import useTranslations from "@/dictionaries/useTranslation";

import {
  groupDataByTimeIntervals,
  TIME_INTERVALS,
} from "../../../utils/reputationManagement/rm.data.util";
import PaperLayout from "../../styled/Layouts/PaperLayout";

dayjs.extend(weekofyear);

interface RatingOverTimeProps {
  ratingOverTime: {
    [date: string]: Array<number>;
    // YYYY-MM-DD: Array<rating>
  };
}
interface graphDataUnit {
  name: string; //x
  avgRating: number;
}

export function RatingOverTime({
  ratingOverTime: ratingOverTime,
  ...props
}: RatingOverTimeProps & PaperProps) {
  const [timeInterval, setTimeInterval] = useState<TIME_INTERVALS>(
    TIME_INTERVALS.Yearly,
  );
  const { translations } = useTranslations();
  const sortedDates = Object.keys(ratingOverTime).sort(
    (a, b) => dayjs(a).unix() - dayjs(b).unix(),
  );
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const [brushStartIndex, setBrushStartIndex] = useState(0);

  const graphDataByTimeIntervals = groupDataByTimeIntervals(
    timeInterval,
    ratingOverTime,
    firstDate,
    lastDate,
  );

  let minAvgRating = 5;
  let maxAvgRating = 0;

  const graphData: Array<graphDataUnit> = Object.keys(
    graphDataByTimeIntervals,
  ).map((k) => {
    const avg =
      graphDataByTimeIntervals[k].reduce((a, b) => a + b, 0) /
      graphDataByTimeIntervals[k].length;
    if (avg < minAvgRating) {
      minAvgRating = avg;
    } else if (avg > maxAvgRating) {
      maxAvgRating = avg;
    }
    return {
      name: k,
      avgRating: avg,
    };
  });

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
            {translations["Rating Over Time"]}
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
            <LineChart data={graphData}>
              <XAxis dataKey="name" />
              <YAxis type="number" tickCount={6} domain={[0, 5]} />
              <RTooltip formatter={(value: number) => value.toFixed(2)} />
              <Legend />
              <Line type="monotone" dataKey="avgRating" stroke="#8884d8" />
              <CartesianGrid strokeDasharray={"3 3"} />
              <Brush
                dataKey="name"
                height={30}
                stroke="#8884d8"
                startIndex={brushStartIndex}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Stack>
    </PaperLayout>
  );
}
