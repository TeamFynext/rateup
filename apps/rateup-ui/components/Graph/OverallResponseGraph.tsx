import {
  Stack,
  Group,
  ActionIcon,
  Text,
  Tooltip as MantineTooltip,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  Brush,
  Tooltip,
} from "recharts";
import { lexend400 } from "../../utils/fonts";
import { RateupButtonBlue } from "../Button/RateupButtons";
import NothingFound from "../NothingFound/NothingFound";
import PaperLayout from "../styled/Layouts/PaperLayout";
import classes from "./graph.module.css";

const OverallResponseGraph = ({
  data,
  timePeriod,
  setTimePeriod,
  isFetching,
  refetch,
  surveysSummary,
}) => {
  let total = 0;
  if (
    surveysSummary &&
    surveysSummary.surveys &&
    surveysSummary.stoppedSurveys
  ) {
    const activeResponses = surveysSummary.surveys
      .filter((survey) => survey.active)
      .flatMap((survey) => survey.teams.flatMap((team) => team.responses));

    const stoppedResponses = surveysSummary.stoppedSurveys.flatMap((survey) =>
      survey.teams.flatMap((team) => team.responses),
    );
    total = activeResponses.length + stoppedResponses.length;
  }

  return (
    <PaperLayout px="xl" py="sm" style={{ flex: 0.7 }} miw={300} w={"100%"}>
      <>
        <Stack>
          <Group justify="space-between">
            <Group>
              <Stack align="center" gap={0}>
                <Text fz={32} c="#595959">
                  {total}
                </Text>
                <Text className={lexend400.className} fz="xl" c="dimmed">
                  Overall Responses
                </Text>
              </Stack>
              <MantineTooltip label="Refresh data">
                <ActionIcon
                  variant="light"
                  aria-label="Settings"
                  onClick={refetch}
                >
                  <IconRefresh
                    className={isFetching ? classes.rotateInfinitely : null}
                    style={{ width: "90%", height: "90%" }}
                    stroke={1.5}
                  />
                </ActionIcon>
              </MantineTooltip>
            </Group>

            <Group justify="flex-end">
              <RateupButtonBlue
                variant={timePeriod === "hourly" ? "filled" : "subtle"}
                radius="lg"
                color={timePeriod !== "hourly" ? "gray" : "black"}
                onClick={() => setTimePeriod("hourly")}
                title="Hourly"
              />

              <RateupButtonBlue
                variant={timePeriod === "daily" ? "filled" : "subtle"}
                radius="lg"
                color={timePeriod !== "daily" ? "gray" : "black"}
                onClick={() => setTimePeriod("daily")}
                title="Daily"
              />
              <RateupButtonBlue
                variant={timePeriod === "weekly" ? "filled" : "subtle"}
                radius="lg"
                color={timePeriod !== "weekly" ? "gray" : "black"}
                onClick={() => setTimePeriod("weekly")}
                title="Weekly"
              />
            </Group>
          </Group>
        </Stack>
        <ResponsiveContainer width="100%" height={380}>
          {total > 0 ? (
            <AreaChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
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
              <XAxis
                dataKey="date"
                tickFormatter={(str) =>
                  timePeriod === "hourly"
                    ? dayjs(str).format("h A")
                    : timePeriod === "daily"
                      ? dayjs(str).format("MMM DD")
                      : str
                }
              />
              <YAxis allowDecimals={false} />
              <Tooltip content={<CustomTooltip timePeriod={timePeriod} />} />
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
                tickFormatter={(str) =>
                  timePeriod === "hourly"
                    ? dayjs(str).format("h A")
                    : timePeriod === "daily"
                      ? dayjs(str).format("MMM DD")
                      : str
                }
                fill="var(--light-grey-color-3)"
              />
            </AreaChart>
          ) : (
            <NothingFound text="No data to display" />
          )}

          {/* TODO : dots showing only on hover, show dots always in area chart */}
        </ResponsiveContainer>
      </>
    </PaperLayout>
  );
};

interface iProps {
  active?: any;
  payload?: any;
  label?: any;
  timePeriod?: any;
}
const CustomTooltip = ({ active, payload, label, timePeriod }: iProps) => {
  if (active && payload && payload?.length) {
    label =
      timePeriod === "hourly"
        ? dayjs(label).format("MMM DD, YYYY h A")
        : timePeriod === "daily"
          ? dayjs(label).format("MMM DD, YYYY")
          : label;
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
        <p className="intro">{`Responses: ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

export default OverallResponseGraph;
