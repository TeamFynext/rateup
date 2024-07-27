import { useState } from "react";

import { Box, Group, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { FlowCardListSkeleton } from "@/components/animation/skeleton/wa/FlowCardList.skeleton";
import InfoButton from "@/components/Button/InfoButton";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RefreshButton from "@/components/Button/RefreshButton";
import { TeamSelector } from "@/components/input/TeamSelector";
import NothingFound from "@/components/NothingFound/NothingFound";
import WaFlowTourSteps from "@/components/WelcomeTour/components/FlowTourSteps";
import WelcomeTour from "@/components/WelcomeTour/WelcomeTour";
import CreateFlowModal from "@/components/whatsapp/flows/CreateFlowModal/CreateFlowModal.tsx";
import FlowCardsList from "@/components/whatsapp/flows/FlowCardsList";
import { SyncFlowsButton } from "@/components/whatsapp/flows/SyncFlows";
import { docsPath } from "@/utils/constants";

import styles from "./flows.module.css";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  let { data: flows, isPending, isError, refetch } = useWaFlowsFromDb();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { isPending: isPendingTeamsUser, data: teamsDataUser } =
    useTeamsByUser();

  const tourSteps = WaFlowTourSteps({ styles });
  let teamsData = teamsDataUser?.data;

  const ComponentToBeRendered = () => {
    if (isPending || isPendingTeamsUser) return <FlowCardListSkeleton />;
    if (isError) return <ErrorComponent refetch={refetch} />;
    if (!flows?.length) return <NothingFound text="No Flows Available" />;
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
          <Title className={styles["heading-container"]}>Flows</Title>
          <InfoButton docUrl={`${docsPath}/whatsappSurvey/flows`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["flow", "db"]} />
          <RateupButtonBlue
            className={styles["create-button"]}
            title="Create flow"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateFlowModalOpen}
            disabled={isPending || isPendingTeamsUser}
          />
        </Group>
        <Group>
          <TeamSelector
            className={styles["team-select-option"]}
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
