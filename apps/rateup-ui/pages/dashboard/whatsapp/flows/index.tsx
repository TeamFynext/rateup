import { Box, Title, Group } from "@mantine/core";
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
import InfoButton from "../../../../components/Button/InfoButton";
import { docsPath } from "../../../../utils/constants";
import { FlowCardListSkeleton } from "../../../../components/animation/skeleton/wa/FlowCardList.skeleton";
import ErrorComponent from "../../../../components/404/ErrorComponent";
import RefreshButton from "../../../../components/Button/RefreshButton";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  let {
    data: flows,
    isPending,
    isError,
    isRefetching,
    refetch,
  } = useWaFlowsFromDb();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { isPending: isPendingTeamsUser, data: teamsDataUser } =
    useTeamsByUser();

  let teamsData = teamsDataUser?.data;

  const ComponentToBeRendered = () => {
    if (isPending || isRefetching || isPendingTeamsUser)
      return <FlowCardListSkeleton />;
    if (isError) return <ErrorComponent refetch={refetch} />;
    if (!(flows && flows.length))
      return <NothingFound text="No Flows Available" />;
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
    return (
      <Box className={styles["flows-list-div"]}>
        <FlowCardsList flows={filteredMenus} teamsData={teamsData} />
      </Box>
    );
  };
  return (
    <Box className={styles["flows-list-page-container"]}>
      <Group justify="space-between">
        <Group>
          <Title className={styles["flows-list-heading-h1"]}>Flows</Title>
          <InfoButton docUrl={`${docsPath}/whatsappSurvey/flows`} />
          <RefreshButton queryKeys={["flow", "db"]} />
          <RateupButtonBlue
            title="Create flow"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateFlowModalOpen}
            disabled={isPending || isPendingTeamsUser}
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

      <ComponentToBeRendered />

      <CreateFlowModal
        opened={isCreateFlowModalOpened}
        onClose={handleCreateFlowModalClose}
      />
    </Box>
  );
}

export default Flows;
