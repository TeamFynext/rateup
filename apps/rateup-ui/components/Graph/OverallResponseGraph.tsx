import React, { useMemo } from "react";

import {
  ActionIcon,
  Group,
  Tooltip as MantineTooltip,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAllSurveysSummary } from "../../backend/surveys/surveys.query";
import { RateupButtonBlue } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import NothingFound from "../NothingFound/NothingFound";
import PaperLayout from "../styled/Layouts/PaperLayout";
import classes from "./graph.module.css";

const OverallResponseGraph = ({
  data,
  timePeriod,
  setTimePeriod,
  className,
  translations,
  isLoading,
  onRefresh,
}) => {
  const total = useMemo(() => {
    return data?.reduce((total, item) => (total += item?.responses), 0);
  }, [data]);

  if (isLoading) {
    return (
      <PaperLayout className={`${classes["graph-root-div"]} ${className}`}>
        <Stack w={"100%"}>
          <Group justify="space-between">
            <Skeleton h={20} w={"40%"} />
            <Group justify="space-between">
              <Skeleton h={20} w={100} />
              <Skeleton h={20} w={100} />
              <Skeleton h={20} w={100} />
            </Group>
          </Group>
          <Group h={380} w={"100%"}>
            <Skeleton h={"100%"} w={"1%"} />
            <Skeleton h={"100%"} flex={1} />
          </Group>
        </Stack>
      </PaperLayout>
    );
  }

  return (
    <PaperLayout className={`${classes["graph-root-div"]} ${className}`}>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Stack align="center" gap={0}>
              <Text className={classes["responses-text-p"]} c="#595959">
                {total}
              </Text>
              <Text
                className={`${classes["overall-responses-text-p"]}`}
                c="dimmed"
              >
                {translations["Overall Responses"]}
              </Text>
            </Stack>
            <RefreshButton onClick={onRefresh} />
          </Group>

          <Group className={classes["hour-daily-weekly-btn-container"]}>
            <RateupButtonBlue
              variant={timePeriod === "hourly" ? "filled" : "subtle"}
              radius="lg"
              color={timePeriod !== "hourly" ? "gray" : "black"}
              onClick={() => setTimePeriod("hourly")}
              title={translations["Hourly"]}
            />

            <RateupButtonBlue
              variant={timePeriod === "daily" ? "filled" : "subtle"}
              radius="lg"
              color={timePeriod !== "daily" ? "gray" : "black"}
              onClick={() => setTimePeriod("daily")}
              title={translations["Daily"]}
            />
            <RateupButtonBlue
              variant={timePeriod === "weekly" ? "filled" : "subtle"}
              radius="lg"
              color={timePeriod !== "weekly" ? "gray" : "black"}
              onClick={() => setTimePeriod("weekly")}
              title={translations["Weekly"]}
            />
          </Group>
        </Group>
        <ResponsiveContainer width="100%" height={380}>
          {total > 0 ? (
            <AreaChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              className={classes["area-chart"]}
            >
              <defs>
                <linearGradient id="gradientColor" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--tertiary-color)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--tertiary-color)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip
                content={
                  <CustomTooltip
                    timePeriod={timePeriod}
                    translations={translations}
                  />
                }
              />
              {/* <Legend /> */}
              <CartesianGrid stroke="#f5f5f5" />
              <Area
                type="monotone"
                dataKey="responses"
                fillOpacity={0.7}
                fill="url(#gradientColor)"
                stroke="var(--tertiary-color)"
                strokeWidth={2}
              />
              <Brush
                height={15}
                dataKey="date"
                fill="var(--light-grey-color-3)"
              />
            </AreaChart>
          ) : (
            <NothingFound text={translations["No data to display"]} />
          )}

          {/* TODO : dots showing only on hover, show dots always in area chart */}
        </ResponsiveContainer>
      </Stack>
    </PaperLayout>
  );
};

interface iProps {
  active?: any;
  payload?: any;
  label?: any;
  timePeriod?: any;
  translations?: any;
}
const CustomTooltip = ({
  active,
  payload,
  label,
  timePeriod,
  translations,
}: iProps) => {
  if (active && payload && payload?.length) {
    label =
      timePeriod === "hourly"
        ? `Today ${label}`
        : timePeriod === "daily"
          ? `${label} ${dayjs().year()}`
          : `Week ${label}`;
    return (
      <div
        className="custom-tooltip"
        style={{
          background: "#fff",
          padding: "2px 15px",
          border: "1px solid #3F5BA9",
          boxSizing: "border-box",
          borderRadius: "10px",
        }}
      >
        <p className="label">{label}</p>
        <p className="intro">{`${translations["Responses"]}: ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

export default React.memo(OverallResponseGraph);
