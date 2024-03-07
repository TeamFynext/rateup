import { Box, Title, LoadingOverlay, Group } from "@mantine/core";
import styles from "./flows.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateFlowModal from "../../../../components/whatsapp/flows/CreateFlowModal/CreateFlowModal.tsx";
import { useDisclosure } from "@mantine/hooks";
import FlowCardsList from "../../../../components/whatsapp/flows/FlowCardsList";
import NothingFound from "../../../../components/NothingFound/NothingFound";
import { useWaFlowsFromDb } from "../../../../backend/whatsapp/flow/flow.query";
import { SyncFlowsButton } from "../../../../components/whatsapp/flows/SyncFlows";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { useTeamsByUser } from "../../../../backend/team/team.query";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { useState } from "react";
import RateupLoader from "../../../../components/Loaders/RateupLoader";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  let { data: flows, isPending } = useWaFlowsFromDb();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { isPending: isPendingTeamsUser, data: teamsDataUser } =
    useTeamsByUser();

  let teamsData = teamsDataUser?.data;
  if (isPendingTeamsUser || isPending) return <RateupLoader h={"100dvh"} />;
  let componentToBeRendered = null;
  if (flows && flows.length) {
    let filteredMenus =
      selectedTeamId === "all"
        ? flows
        : flows?.filter((flow) =>
            flow.survey.teams.some((team) => team.teamId === selectedTeamId),
          );
    filteredMenus = filteredMenus.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    componentToBeRendered = (
      <FlowCardsList flows={filteredMenus} teamsData={teamsData} />
    );
  } else if (flows && !flows.length) {
    componentToBeRendered = <NothingFound text="No Flows Available" />;
  }

  return (
    <Box className={styles["flows-list-page-container"]}>
      <Group justify="space-between">
        <Group>
          <Title className={styles["flows-list-heading-h1"]}>Flows</Title>
          <RateupButtonBlue
            title="Create flow"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateFlowModalOpen}
          />
        </Group>
        <Group>
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
            allowDeselect={false}
          />
          <SyncFlowsButton />
        </Group>
      </Group>

      <Box className={styles["flows-list-div"]}>
        <LoadingOverlay
          visible={isPending || isPendingTeamsUser}
          loaderProps={{ type: "bars" }}
        />
        {componentToBeRendered}
      </Box>

      <CreateFlowModal
        opened={isCreateFlowModalOpened}
        onClose={handleCreateFlowModalClose}
      />
    </Box>
  );
}

export default Flows;
