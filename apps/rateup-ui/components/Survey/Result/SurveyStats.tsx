import React from 'react'
import { Paper, Title, Group, Text , Badge, Stack } from '@mantine/core';

const SurveyStats = ({survey}) => {
  return (
    <Group p = "lg">
      <Stack>
      <Title order={3}> User Stats</Title>

      <Group>
      <Paper shadow='lg' p="md" sx={{maxWidth: "200px"}}>
        <Stack mt="md" mb="xs">
          <Text weight={500} align='center'>{survey?.surveyStats?.visited || 0}</Text>
          <Badge color="blue" variant="light">
            Visited
          </Badge>
        </Stack>
      </Paper>

      <Paper shadow='lg' p="md" sx={{maxWidth: "200px"}}>
        <Stack mt="md" mb="xs">
          <Text weight={500} align='center'>{survey?.surveyStats?.started || 0}</Text>
          <Badge color="blue" variant="light">
            Started
          </Badge>
        </Stack>
      </Paper>

      <Paper shadow='lg' p="md" sx={{maxWidth: "200px"}}>
        <Stack mt="md" mb="xs">
          <Text weight={500} align='center'>{survey?.surveyStats?.completed || 0}</Text>
          <Badge color="blue" variant="light">
            Completed
          </Badge>
        </Stack>
      </Paper>

      </Group>
      </Stack>
    </Group>
  )
}

export default SurveyStats