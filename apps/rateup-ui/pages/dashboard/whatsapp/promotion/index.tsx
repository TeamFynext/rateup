import { Box, Container, Flex, Loader, Select, Tabs, Text } from "@mantine/core";
import { useTeamsByUser } from "../../../../backend/team/team.query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import SelectedTeamContext from "../../../../context/SelectedTeam";
import { PromotionTab } from "../../../../types/enums";
import PromotionRootPanel from "../../../../components/Promotion/RootPanel";

export default function Promotion() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [activeTab, setActiveTab] = useState(PromotionTab.Groups);

  return (
    <Container fluid>
      <Tabs keepMounted={false} value={activeTab} style={{ width: "100%" }} orientation="horizontal">
        {/* TODO: Style tabs */}
        <Flex justify={"end"} mb="xs">
          <TeamSelector selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId} />
        </Flex>
        <Box style={{ height: "90vh" }}>
          <SelectedTeamContext.Provider value={{ selectedTeamId }}>
            <PromotionRootPanel activeTab={activeTab} setActiveTab={setActiveTab} />
          </SelectedTeamContext.Provider>
        </Box>
      </Tabs>
    </Container>
  )
}

// TODO: Since selecting team is required in many places, we could generalize this component and reuse it.
export function TeamSelector({ selectedTeamId, setSelectedTeamId, label = "" }) {
  // TODO: add allowAll boolean prop to allow selecting all teams
  // TODO: remove some nesting on results of the query?
  const { data: teamRes, isLoading: teamsLoading, isError, error } = useTeamsByUser(undefined, null);

  useEffect(() => {
    // Setting the default teamId to the first team in the list
    if (teamRes?.data?.data?.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teamRes?.data?.data[0]?.teamId);
    }
  }, [teamRes, selectedTeamId])
  if (isError) {
    console.error(error)
    return <Text>Something went wrong!</Text>
  }
  if (teamsLoading) {
    console.log('teamRes', teamRes)
    return <Loader />
  }
  const teams = teamRes?.data?.data;
  if (!teams) {
    return <Text>No teams found!</Text>
  }
  const teamOptions = teams.map(team => ({ value: team.teamId, label: team.teamName }));

  return (
    <Select
      mt="xs"
      data={teamOptions}
      defaultValue={teamOptions[0].value}
      onChange={setSelectedTeamId}
      label={label}
    />
  )
}
