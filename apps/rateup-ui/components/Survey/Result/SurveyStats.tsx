import React, { useState } from 'react'
import { Paper, Title, Group, Text, Badge, Stack, Box, Select } from '@mantine/core';
import { Map, Marker } from 'pigeon-maps';
import { useResponses } from '../../../backend/surveys/response/response.query';
import classes from './SurveyStats.module.css'
enum LocationType {
  City = "city",
  State = "state",
  Country = "country"
}
const SurveyStats = ({ survey }) => {
  const { data: responses, isLoading: isResponsesLoading, error: responsesError } = useResponses(survey.id);
  const [zoom, setZoom] = useState(7)
  const [locationType, setLocationType] = useState(LocationType.City)
  if (isResponsesLoading || !responses) {
    // TODO: loading ui
    return null
  }

  const sortedCount = getSortedLocationCount(responses, locationType);
  return (
    <Stack p="lg">
      <Title order={3}> User Stats</Title>

      <Group justify="space-between" align='stretch' mih="400px">
        <Stack
          justify='space-between'
          // style={{
          //   '> *': {
          //     borderRadius: "0.5rem"
          //   }
          // }}  VERIFY MANTINE

          className={classes.stackChildren}
        >
          <Paper shadow='lg' p="md" style={{ maxWidth: "200px" }}>
            <Stack mt="md" mb="xs">
              <Text fw={500} style={{
              textAlign:'center'
            }}>{survey?.surveyStats?.visited || 0}</Text>
              <Badge color="blue" variant="light">
                Visited
              </Badge>
            </Stack>
          </Paper>

          <Paper shadow='lg' p="md" style={{ maxWidth: "200px" }}>
            <Stack mt="md" mb="xs">
              <Text fw={500} style={{
              textAlign:'center'
            }}>{survey?.surveyStats?.started || 0}</Text>
              <Badge color="blue" variant="light">
                Started
              </Badge>
            </Stack>
          </Paper>

          <Paper shadow='lg' p="md" style={{ maxWidth: "200px" }}>
            <Stack mt="md" mb="xs">
              <Text fw={500} style={{
              textAlign:'center'
            }}>{survey?.surveyStats?.completed || 0}</Text>
              <Badge color="blue" variant="light">
                Completed
              </Badge>
            </Stack>
          </Paper>

        </Stack>

        {/* MAP Component */}
        <Paper

          radius={"md"}
          // style={{
          //   overflow: "clip",
          //   flexGrow: 1,
          //   '@media (max-width: 1200px)': {
          //     order: 3,
          //     width: "100%",
          //   },
          // }}  VERIFY MANTINE
          className={`${classes.overflowClip} ${classes.mediaQueryStyles}`}
          h="auto"
          mih={"400px"}
          w="400px"
        >
          <Map
            // TODO: set center = avg(responseLocations)?
            defaultCenter={[10.1632, 76.641]}
            defaultZoom={7}
            onBoundsChanged={({ zoom }) => {
              setZoom(zoom)
            }}
          >
            {responses && responses.map((response) => {
              if (!response.location?.coordinates?.latitude) {
                return null
              }
              const [lat, long] = [response.location.coordinates.latitude, response.location.coordinates.longitude]
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
              )
            })}
          </Map>
        </Paper>

        {/* Location-wise response frequency */}
        <Paper p="sm" radius={"md"} mih={400} maw={350}
          // style={{
          //   '@media (max-width: 1200px)': {
          //     maxWidth: "unset",
          //     flexGrow: 1
          //   }
          // }} VERIFY MANTINE
          className={classes.mediaQueryStylesPaper}
        >
          <Stack>
            <Group
              justify="space-between"
            >
              <Text fz="lg" fw={700} style={{
              textAlign:'center'
            }}>Top Traffic By:</Text>
              <Select
                radius={"xl"}
                data={Object.values(LocationType)}
                value={locationType}
                onChange={setLocationType as (value: LocationType) => void}
                w={150}
              />
            </Group>
            <LocationFrequencyDisplay sortedCount={sortedCount} />
          </Stack>
        </Paper>
      </Group>
    </Stack>

  )
}
function RedDot({ zoom, sx }: { zoom: number, sx?: React.CSSProperties }) {
  return (
    <Box
      style={{
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: "red",
        zIndex: 1000,
        opacity: (zoom + 1) / 18
      }}
    />
  )
}
interface LocationFrequencyDisplayProps {
  sortedCount: Array<[string, number]>
}
function LocationFrequencyDisplay({ sortedCount }: LocationFrequencyDisplayProps) {
  return (
    <Stack
      px="sm"
    >
      {sortedCount.map(([name, count]) => (
        <Group
        justify="space-between"
        >
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
          >{count}</Text>
        </Group>
      ))}
    </Stack>
  )
}

function getSortedLocationCount(responses: SurveyResponse[], locationType: LocationType) {
  let count: {
    [name: string]: number
  } = {};
  responses?.forEach((response) => {
    if (response.location?.[locationType]) {
      count[response.location[locationType]] = (count[response.location[locationType]] || 0) + 1;
    }
  })
  return Object.entries(count).sort((a, b) => b[1] - a[1]);
}

export default SurveyStats