import { Box, Container, Group, Loader, Select, Tabs, Text } from "@mantine/core";
import { IndividualsPanel } from "../../../components/Promotion/RightPanel/IndividualChat";
import { GroupPanel } from "../../../components/Promotion/RightPanel/GroupChat";
import { useTeamsByUser } from "../../../backend/team/team.query";
import { useQueryClient } from "@tanstack/react-query";
import { use, useEffect, useState } from "react";
import SelectedTeamContext from "../../../context/SelectedTeam";


export default function Promotion() {
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // print selectedTeamId when changed 
  // useEffect(() => {
  //   console.log(selectedTeamId);
  // }, [selectedTeamId])

  return (
    <Container fluid>
      <Tabs keepMounted={false} defaultValue="groups" sx={{ width: "100%" }} orientation="horizontal">
        {/* TODO: Style tabs */}
        <Group position="apart" m="xs">
          <Tabs.List sx={{ marginBottom: "2px" }}>
            <Tabs.Tab value="groups" >
              Groups
            </Tabs.Tab>
            <Tabs.Tab value="individuals">
              <Text>Individuals</Text>
            </Tabs.Tab>
          </Tabs.List>
          <TeamSelector selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId} />
        </Group>
        <Box sx={{ border: "solid black 2px", borderRadius: "8px", height: "90vh", display: "flex" }}>
          <SelectedTeamContext.Provider value={{ selectedTeamId }}>
          <Tabs.Panel value="groups" sx={{ flexGrow: 1 }}>
            <GroupPanel />
          </Tabs.Panel>
          <Tabs.Panel value="individuals" sx={{ flexGrow: 1 }}>
            <IndividualsPanel />
          </Tabs.Panel>
          </SelectedTeamContext.Provider>
        </Box>
      </Tabs>
    </Container>
  )
}

// TODO: Since selecting team is required in many places, we could generalize this component and reuse it.
export function TeamSelector({ selectedTeamId, setSelectedTeamId }) {
  // TODO: add allowAll boolean prop to allow selecting all teams
  const queryClient = useQueryClient();
  // TODO: remove some nesting on results of the query?
  const { data: teamRes, isLoading: teamsLoading, isError } = useTeamsByUser(queryClient);

  useEffect(() => {
    // Setting the default teamId to the first team in the list
    if (teamRes?.data?.data?.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teamRes?.data?.data[0]?.teamId);
    }
  }, [teamRes, selectedTeamId])

  if (teamsLoading || !teamRes) {
    return <Loader />
  }
  if (isError) {
    return <Text>Something went wrong!</Text>
  }
  const teams = teamRes?.data?.data;
  const teamOptions = teams.map(team => ({ value: team.teamId, label: team.teamName }));

  return (
    <Select
      mt="xs"
      data={teamOptions}
      defaultValue={teamOptions[0].value}
      onChange={setSelectedTeamId}
    />
  )
}
