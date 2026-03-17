"use client";

import React, { useContext, useMemo, useState } from "react";

import {
  Badge,
  Box,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { Bounds, Map, Marker, ZoomControl } from "pigeon-maps";

import RefreshButton from "@/components/Button/RefreshButton";
import RateupLoader from "@/components/Loaders/RateupLoader";

import {
  useResponseCount,
  useResponses,
} from "../../../backend/surveys/response/response.query";
import {
  useAllResponseForGraph,
  useGetSurveyStats,
} from "../../../backend/surveys/surveys.query";
import { useWaFlowMetrics } from "../../../backend/whatsapp/flow/flow.query";
import SurveyContext from "../../../context/SurveyContext";
import { findCentroid } from "../../../utils/location";
import OverallResponseGraph from "../../Graph/OverallResponseGraph";
import { ContainedSelection } from "../../input/ContainedInput/ContainedInput";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import styles from "./SurveyStats.module.css";

enum LocationType {
  City = "city",
  State = "state",
  Country = "country",
}
const maxZoom = 15;
const minZoom = 2;

export const SurveyResponseStats = ({ flowId = null, surveyId }) => {
  const translations = useExtracted();
  const { filterTeams } = useContext(SurveyContext);
  const {
    data: responseCountData,
    isLoading,
    refetch: refetchCount,
    isPending: isPendingCount,
  } = useResponseCount(surveyId);

  const responseCount = useMemo(
    () =>
      filterTeams?.length
        ? responseCountData?.teamWiseCount?.reduce((total, teamMap) => {
            if (filterTeams.includes(teamMap.id)) total += teamMap.count;
            return total;
          }, 0)
        : responseCountData?.all,
    [responseCountData, filterTeams],
  );
  const {
    data: surveyStats,
    isPending: isStatsLoading,
    refetch: refetchStats,
  } = useGetSurveyStats(surveyId);
  const surveyStatsCountArray = useMemo(() => {
    let filteredStats = surveyStats ? [...surveyStats] : [];
    if (flowId) return [];
    if (filterTeams?.length > 0) {
      filteredStats = surveyStats?.filter((team: STStats) =>
        filterTeams?.includes(team?.surveyTeamMapId),
      );
    }
    let totalStats = filteredStats?.reduce(
      (
        acc: { visited: number; completed: number; started: number },
        curr: STStats,
      ) => {
        acc.visited += curr?.visited ?? 0;
        acc.completed += curr?.completed ?? 0;
        acc.started += curr?.started ?? 0;
        return acc;
      },
      { visited: 0, completed: 0, started: 0 },
    );
    return [
      {
        label: translations("Visited") ?? "Visited",
        count: surveyStats ? totalStats?.visited : "NA",
      },
      {
        label: translations("Started") ?? "Started",
        count: surveyStats ? totalStats?.started : "NA",
      },
      {
        label: translations("Completed") ?? "Completed",
        count: surveyStats ? totalStats?.completed : "NA",
      },
    ];
  }, [surveyStats, translations]);

  return (
    <PaperLayout className={styles["user-stats-card-div"]} w={"fit-content"}>
      <Stack gap={0}>
        <Group>
          <Heading subtitle={translations("User Stats")} />
          <Tooltip label={translations("Refresh stats")}>
            <RefreshButton
              onClick={async () => {
                refetchStats();
                refetchCount();
              }}
              isLoading={isPendingCount || isLoading || isStatsLoading}
            />
          </Tooltip>
        </Group>
        <Stack>
          <Text
            className={styles["responses-text-p"]}
            c="light-dark(var(--mantine-primary-color-filled),white)"
          >
            {responseCount ?? 0} &nbsp;
            {responseCount > 1
              ? translations("Responses")
              : translations("Response")}
          </Text>
          {surveyStatsCountArray.length > 0 &&
            surveyStatsCountArray?.map(({ count, label }) => (
              <PaperLayout className={styles["stats-card"]} key={label}>
                <Stack align={"center"}>
                  <Skeleton visible={isStatsLoading} w={"100%"}>
                    <Text fs={"20px"} fw="900" size={"30px"} ta={"center"}>
                      {count}
                    </Text>
                  </Skeleton>
                  <Badge variant="light">{label}</Badge>
                </Stack>
              </PaperLayout>
            ))}
        </Stack>
      </Stack>
    </PaperLayout>
  );
};
export const ResponseGraphBySurvey = ({ surveyId }) => {
  const translations = useExtracted();
  const { filterTeams } = useContext(SurveyContext);
  const [timePeriod, setTimePeriod] = useState("daily");
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const {
    data: graphResponse,
    isLoading: isrLoading,
    isRefetching,
  } = useAllResponseForGraph(timePeriod, userTimeZone, surveyId, filterTeams);
  const queryClient = useQueryClient();
  return (
    <OverallResponseGraph
      className={styles["overall-responses-graph"]}
      data={graphResponse}
      timePeriod={timePeriod}
      setTimePeriod={setTimePeriod}
      isLoading={isrLoading || isRefetching}
      onRefresh={async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            [
              "reponse",
              "graph",
              timePeriod,
              userTimeZone,
              surveyId,
              filterTeams,
            ],
          ],
        });
      }}
    />
  );
};
const SurveyStats = ({ survey, flowId = null }) => {
  const translations = useExtracted();
  const { surveyTeamMapId, filterTeams } = useContext(SurveyContext);
  const {
    data: responses,
    isLoading: isResponsesLoading,
    error: responsesError,
  } = useResponses(surveyTeamMapId);

  const {
    data: responseCountData,
    isLoading,
    refetch: refetchCount,
    isPending: isPendingCount,
  } = useResponseCount(survey?.id);

  const responseCount = useMemo(
    () =>
      filterTeams?.length
        ? responseCountData?.teamWiseCount?.reduce((total, teamMap) => {
            if (filterTeams.includes(teamMap.id)) total += teamMap.count;
            return total;
          }, 0)
        : responseCountData?.all,
    [responseCountData, filterTeams],
  );
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useState(7);
  const [isFindingZoomLevel, setIsFindingZoomLevel] = useState(false);
  const [locationType, setLocationType] = useState(LocationType.City);
  const [timePeriod, setTimePeriod] = useState("daily");
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const {
    data: graphResponse,
    isLoading: isrLoading,
    isRefetching,
  } = useAllResponseForGraph(timePeriod, userTimeZone, survey?.id, filterTeams);
  const { data: flowMetrics, isPending } = useWaFlowMetrics(
    flowId,
    !!flowId && responseCount > 250,
  );

  if (
    isResponsesLoading ||
    !responses ||
    (flowId && responseCount > 250 && isPending)
  ) {
    return <RateupLoader />;
  }
  function returnSurveyStats() {
    let filteredStats: Array<any>;
    if (filterTeams?.length > 0) {
      filteredStats = survey?.teams
        ?.filter((team: STeam) => filterTeams?.includes(team?.mapId))
        .map((team: STeam) => team?.surveyStats);
    } else {
      filteredStats = survey?.teams?.map((team: STeam) => team?.surveyStats);
    }
    return {
      visited: filteredStats?.reduce(
        (acc: number, curr: any) => acc + (curr ? curr?.visited : 0),
        0,
      ),
      started: filteredStats?.reduce(
        (acc: number, curr: any) => acc + (curr ? curr?.started : 0),
        0,
      ),
      completed: filteredStats?.reduce(
        (acc: number, curr: any) => acc + (curr ? curr?.completed : 0),
        0,
      ),
    };
  }

  const sortedCount = getSortedLocationCount(responses, locationType);
  const coords: Coordinates[] = responses.reduce((acc, curr) => {
    if (
      curr?.location?.coordinates?.latitude &&
      curr?.location?.coordinates?.longitude
    ) {
      acc.push(curr.location.coordinates);
    }
    return acc;
  }, [] as Coordinates[]);
  const centroid = findCentroid(coords);
  const surveyStatsCountArray = [];
  if (flowMetrics) {
    surveyStatsCountArray.push({
      label: translations("Flow Visited"),
      count: flowMetrics?.metric?.data_points?.[0]?.value ?? 0,
    });
  } else if (!flowId) {
    surveyStatsCountArray.push(
      {
        label: translations("Visited"),
        count: returnSurveyStats()?.visited ?? 0,
      },
      {
        label: translations("Started"),
        count: returnSurveyStats()?.started ?? 0,
      },
      {
        label: translations("Completed"),
        count: returnSurveyStats()?.completed ?? 0,
      },
    );
  }
  return (
    <Stack p={3}>
      <Stack mih="400px" gap={10}>
        <PaperLayout className={styles["user-stats-card-div"]}>
          <Stack gap={0}>
            <Group>
              <Heading subtitle={translations("User Stats")} />
              <Tooltip label={translations("Refresh stats")}>
                <RefreshButton
                  onClick={async () => {
                    await queryClient.invalidateQueries({
                      queryKey: ["survey", survey?.id],
                    });
                    refetchCount();
                  }}
                  isLoading={isPendingCount || isLoading}
                />
              </Tooltip>
            </Group>

            <Group justify="space-between">
              <Text
                className={styles["responses-text-p"]}
                c="light-dark(var(--mantine-primary-color-filled),white)"
              >
                {responseCount ?? 0} &nbsp;
                {responseCount > 1
                  ? translations("Responses")
                  : translations("Response")}
              </Text>
              {surveyStatsCountArray?.length === 0 ? (
                <PaperLayout className={styles["stats-card"]}>
                  <Text fw="900">
                    {translations("Minimum 250+ response for metrics")}
                  </Text>
                </PaperLayout>
              ) : (
                surveyStatsCountArray?.map(({ count, label }) => (
                  <PaperLayout className={styles["stats-card"]} key={label}>
                    <Stack align={"center"}>
                      <Text fs={"20px"} fw="900" size={"30px"}>
                        {count}
                      </Text>
                      <Badge variant="light">{label}</Badge>
                    </Stack>
                  </PaperLayout>
                ))
              )}
            </Group>
          </Stack>
        </PaperLayout>
        {!flowId && (
          <Grid columns={10} p={2} gutter={"10px"} grow>
            {/* Location-wise response frequency */}
            <Grid.Col span={{ xs: 10, md: 3 }}>
              <PaperLayout h="350px">
                <Stack>
                  <Group justify="space-between">
                    <Heading subtitle={translations("Top Traffic By:")} />
                    <ContainedSelection
                      maw={100}
                      radius={"xl"}
                      data={Object.values(LocationType)}
                      value={locationType}
                      onChange={
                        setLocationType as (value: LocationType) => void
                      }
                      w={150}
                    />
                  </Group>
                  <LocationFrequencyDisplay sortedCount={sortedCount} />
                </Stack>
              </PaperLayout>
            </Grid.Col>
            {/* MAP Component */}
            <Grid.Col span={{ xs: 10, md: 5 }}>
              <PaperLayout
                style={{ overflow: "hidden" }}
                p={0}
                w="100%"
                h={"100%"}
                mih={350}
              >
                <Map
                  defaultCenter={
                    centroid
                      ? [centroid.latitude, centroid.longitude]
                      : [20, 78]
                  } // default set to India
                  zoom={zoom}
                  onBoundsChanged={({ zoom, bounds, initial }) => {
                    if (initial) {
                      if (!centroid) return setZoom(2);
                      setIsFindingZoomLevel(true);
                    }
                    if (initial || isFindingZoomLevel) {
                      // so that we wont reset user actions
                      // TODO: find out if we can calculate the `bounds` using center, zoomLevel, and heightxwidth
                      //       then we could calculate the zoomLevel in one go instead of waiting for pigeonMaps to render and return the current bounds
                      const zoomAction = zoomInorOutToDisplayAllMarkers(
                        coords,
                        bounds,
                      );
                      if (zoomAction === ZoomAction.Out && minZoom < zoom) {
                        setZoom(zoom - 1);
                        return;
                      } else {
                        setIsFindingZoomLevel(false); // TODO: also set it to false if user manually zooms in/out before finding the zoom level
                        return;
                      }
                    }
                    setZoom(zoom);
                  }}
                  metaWheelZoom={true}
                >
                  <ZoomControl />
                  {coords &&
                    coords.map(({ latitude, longitude }, index) => {
                      if (!latitude || !longitude) return;
                      return (
                        <Marker
                          anchor={[latitude, longitude]}
                          style={{
                            opacity: 0.7,
                          }}
                          offset={[-10, -21]}
                          key={index}
                        >
                          <RedDot zoom={zoom} />
                        </Marker>
                      );
                    })}
                </Map>
              </PaperLayout>
            </Grid.Col>
          </Grid>
        )}
        <OverallResponseGraph
          className={styles["overall-responses-graph"]}
          data={graphResponse}
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          isLoading={isrLoading || isRefetching}
          onRefresh={async () => {
            await queryClient.invalidateQueries({
              queryKey: [
                [
                  "reponse",
                  "graph",
                  timePeriod,
                  userTimeZone,
                  survey?.id,
                  filterTeams,
                ],
              ],
            });
          }}
        />
      </Stack>
    </Stack>
  );
};
function RedDot({ zoom }: { zoom: number }) {
  return (
    <Box
      style={{
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: "red", // TODO: maybe provide a radial gradient & variable radius based on 'zoom' to have a heatmap effect?
        zIndex: 1000,
        opacity: Math.max((zoom + 1) / 18, 0.2),
      }}
    />
  );
}
interface LocationFrequencyDisplayProps {
  sortedCount: Array<[string, number]>;
}
function LocationFrequencyDisplay({
  sortedCount,
}: LocationFrequencyDisplayProps) {
  return (
    <Stack px="sm">
      {sortedCount.map(([name, count]) => (
        <Group justify="space-between" key={name}>
          <Text c="#222">{name}</Text>
          <Text
            px="12px"
            py="2px"
            style={{
              backgroundColor: "#3F5BA9",
              borderRadius: "100px",
              color: "white",
              fontWeight: 900,
            }}
          >
            {count}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

function getSortedLocationCount(
  responses: SurveyResponse[],
  locationType: LocationType,
) {
  let count: {
    [name: string]: number;
  } = {};
  responses?.forEach((response) => {
    if (response?.location?.[locationType]) {
      count[response?.location[locationType]] =
        (count[response?.location[locationType]] || 0) + 1;
    }
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1]);
}
enum ZoomAction {
  In,
  Out,
}
function zoomInorOutToDisplayAllMarkers(coords: Coordinates[], bounds: Bounds) {
  const [latMax, longMax] = bounds.ne;
  const [latMin, longMin] = bounds.sw;
  let outOfBounds = false;

  const numberOfCoords = coords.length;
  for (let i = 0; i < numberOfCoords; i++) {
    if (
      !(
        coords[i].latitude >= latMin &&
        coords[i].latitude <= latMax &&
        coords[i].longitude >= longMin &&
        coords[i].longitude <= longMax
      )
    ) {
      outOfBounds = true;
      break;
    }
  }

  if (outOfBounds) {
    return ZoomAction.Out;
  } else {
    return ZoomAction.In;
  }
}

export default SurveyStats;
