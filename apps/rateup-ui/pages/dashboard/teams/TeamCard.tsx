import { Flex, Group,Stack,  Paper, Space, Text,Badge, useMantineTheme } from '@mantine/core';
import { useRouter } from 'next/router';
import React from 'react'

const TeamCard = ({team, reftchTeams}) => {
    const theme = useMantineTheme();
    const router = useRouter();
  return (
    <Paper
      p="md"shadow="lg" radius="lg"
      style={{ cursor: "pointer", width:"250px", height:"140px" }}
      onClick={() => {
        router.push(`teams/${team.code}`);
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={700}>
          {team.teamName}
        </Text>        
      </Flex>
      <Stack  mt="sm" gap="xs">

      <Group gap="xs">

        <Text size="sm" c="dimmed">
          Code: 

        </Text>
        <Badge color="blue.9" variant="outline">{team.code} </Badge>
        </Group>


        <Group align={"center"} gap="xs">
         <Text  fz="sm" c="dimmed">Total Members : </Text>
          <Text fw={500} fz="sm">{team.memberCount}</Text>
        </Group>
      </Stack>
      <Space h="xl" />
      <Space h="lg" />

    </Paper>
  )
}

export default TeamCard