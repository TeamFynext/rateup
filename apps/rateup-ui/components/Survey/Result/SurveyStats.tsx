import React, { useContext, useState } from "react";
import { Group, Text, Badge, Stack, Box, Grid } from "@mantine/core";
import { Bounds, Map, Marker, ZoomControl } from "pigeon-maps";
import {
  useAllResponses,
  useResponses,
} from "../../../backend/surveys/response/response.query";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedSelection } from "../../input/ContainedInput/ContainedInput";
import SurveyContext from "../../../context/SurveyContext";
import { getFilteredResponsesUsingTeam } from "../../../utils/team/surveyTeam";
import { findCentroid } from "../../../utils/location";
enum LocationType {
  City = "city",
  State = "state",
  Country = "country",
}
const maxZoom = 15;
const minZoom = 2;

const SurveyStats = ({ survey }) => {
  const { surveyTeamMapId, filterTeams } = useContext(SurveyContext);
  const {
    data: responses,
    isLoading: isResponsesLoading,
    error: responsesError,
  } = useResponses(surveyTeamMapId);
  const {
    data: teamWiseResponses,
    isLoading: rLoading,
    error: rError,
  } = useAllResponses(survey?.id);
  const [zoom, setZoom] = useState(7);
  const [isFindingZoomLevel, setIsFindingZoomLevel] = useState(false);
  const [locationType, setLocationType] = useState(LocationType.City);
  if (isResponsesLoading || !responses) {
    // TODO: loading ui
    return null;
  }
  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );
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
  const responseLength = filteredResponsesByTeam?.reduce(
    (acc: number, curr: any) => acc + curr?._count["responses"],
    0,
  );
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
  const surveyStatsCountArray = [
    {
      label: "Visited",
      count: returnSurveyStats()?.visited ?? 0,
    },
    {
      label: "Started",
      count: returnSurveyStats()?.started ?? 0,
    },
    {
      label: "Completed",
      count: returnSurveyStats()?.completed ?? 0,
    },
  ];
  return (
    <Stack>
      <Stack mih="400px" gap={10}>
        <PaperLayout px="lg" py={"lg"}>
          <Stack gap={0}>
            <Heading subtitle="User Stats" />
            <Group justify="space-between">
              <Text c="var(--tertiary-color" size="28px" fw="700" px="xl">
                {responseLength ?? 0} &nbsp;{" "}
                {responseLength > 1 ? "Responses" : "Response"}
              </Text>
              {surveyStatsCountArray?.map(({ count, label }) => (
                <PaperLayout style={{ flex: 1 }} key={label}>
                  <Stack align={"center"}>
                    <Text fs={"20px"} fw="900" size={"30px"}>
                      {count}
                    </Text>
                    <Badge color="blue" variant="light">
                      {label}
                    </Badge>
                  </Stack>
                </PaperLayout>
              ))}
            </Group>
          </Stack>
        </PaperLayout>
        <Grid columns={10} p={2}>
          {/* Location-wise response frequency */}
          <Grid.Col span={{ xs: 10, md: 4 }}>
            <PaperLayout miw={300} h="350px">
              <Stack>
                <Group justify="space-between">
                  <Heading subtitle="Top Traffic By:" />
                  <ContainedSelection
                    maw={100}
                    radius={"xl"}
                    data={Object.values(LocationType)}
                    value={locationType}
                    onChange={setLocationType as (value: LocationType) => void}
                    w={150}
                  />
                </Group>
                <LocationFrequencyDisplay sortedCount={sortedCount} />
              </Stack>
            </PaperLayout>
          </Grid.Col>
          {/* MAP Component */}
          <Grid.Col span={{ xs: 10, md: 6 }}>
            <PaperLayout
              style={{ overflow: "hidden" }}
              p={0}
              w="100%"
              h={"100%"}
              mih={350}
            >
              <Map
                defaultCenter={[centroid?.latitude, centroid?.longitude]}
                zoom={zoom}
                onBoundsChanged={({ zoom, bounds, initial }) => {
                  if (initial) {
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
                    if (zoomAction === ZoomAction.Out) {
                      if (minZoom < zoom) {
                        setZoom(zoom - 1);
                        return;
                      }
                    } else {
                      setIsFindingZoomLevel(false);
                      return;
                    }
                  }
                  setZoom(zoom);
                }}
                metaWheelZoom={true}
              >
                <ZoomControl />
                {coords &&
                  coords.map(({ latitude, longitude }) => {
                    if (!latitude || !longitude) return;
                    return (
                      <Marker
                        anchor={[latitude, longitude]}
                        style={{
                          opacity: 0.7,
                        }}
                        offset={[-10, -21]}
                      >
                        <RedDot zoom={zoom} />
                      </Marker>
                    );
                  })}
              </Map>
            </PaperLayout>
          </Grid.Col>
        </Grid>
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
        opacity: (zoom + 1) / 18,
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
