import React, { useState } from "react";
import { Paper, Group, Text, Badge, Stack, Box, Grid } from "@mantine/core";
import { Map, Marker, ZoomControl } from "pigeon-maps";
import { useResponses } from "../../../backend/surveys/response/response.query";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedSelection } from "../../input/ContainedInput/ContainedInput";
enum LocationType {
  City = "city",
  State = "state",
  Country = "country",
}
const SurveyStats = ({ survey }) => {
  const {
    data: responses,
    isLoading: isResponsesLoading,
    error: responsesError,
  } = useResponses(survey?.id);
  const [zoom, setZoom] = useState(7);
  const [locationType, setLocationType] = useState(LocationType.City);
  if (isResponsesLoading || !responses) {
    // TODO: loading ui
    return null;
  }
  const sortedCount = getSortedLocationCount(responses, locationType);
  const surveyStatsCountArray = [
    {
      label: "Responses",
      count: responses?.length ?? 0,
    },
    {
      label: "Visited",
      count: survey?.surveyStats?.visited ?? 0,
    },
    {
      label: "Started",
      count: survey?.surveyStats?.started ?? 0,
    },
    {
      label: "Completed",
      count: survey?.surveyStats?.completed ?? 0,
    },
  ];
  return (
    <Stack>
      <Heading subtitle="User Stats" />
      <Stack mih="400px" gap={10}>
        <Group justify="space-between">
          {surveyStatsCountArray.map(({ count, label }) => (
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
            <Paper
              style={{ overflow: "hidden", borderRadius: "12px" }}
              w="100%"
              h={"100%"}
              mih={350}
              bg="red"
            >
              <Map
                // TODO: set center = avg(responseLocations)?
                defaultCenter={[10.1632, 76.641]}
                defaultZoom={7}
                onBoundsChanged={({ zoom }) => {
                  setZoom(zoom);
                }}
                metaWheelZoom={true}
              >
                <ZoomControl />
                {responses &&
                  responses.map((response) => {
                    if (!response.location?.coordinates?.latitude) {
                      return null;
                    }
                    const [lat, long] = [
                      response.location.coordinates.latitude,
                      response.location.coordinates.longitude,
                    ];
                    return (
                      <Marker
                        anchor={[lat, long]}
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
            </Paper>
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
        backgroundColor: "red",
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
        <Group justify="space-between">
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
    if (response.location?.[locationType]) {
      count[response.location[locationType]] =
        (count[response.location[locationType]] || 0) + 1;
    }
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1]);
}

export default SurveyStats;
