import { Box, Container, Flex, Loader, Select, Tabs, Text } from "@mantine/core";
import { useTeamsByUser } from "../../../backend/team/team.query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import SelectedTeamContext from "../../../context/SelectedTeam";
import { PromotionTab } from "../../../types/enums";
import PromotionRootPanel from "../../../components/Promotion/RootPanel";

export default function Promotion() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [activeTab, setActiveTab] = useState(PromotionTab.Groups);

  // print selectedTeamId when changed 
  // useEffect(() => {
  //   console.log(selectedTeamId);
  // }, [selectedTeamId])

  return (
    <Container fluid>
      <Tabs keepMounted={false} value={activeTab} sx={{ width: "100%" }} orientation="horizontal">
        {/* TODO: Style tabs */}
        <Flex justify={"end"} mb="xs">
          <TeamSelector selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId} />
        </Flex>
        <Box sx={{ height: "90vh" }}>
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
