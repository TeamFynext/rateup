"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useTranslations } from "next-intl";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { ListPageLayout } from "@/components/common/list-page-layout";
import { sortData } from "@/components/Dashboard/SortDropDown";
import { TeamSelector } from "@/components/input/TeamSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WaFlowTourSteps from "@/components/WelcomeTour/components/FlowTourSteps";
import CreateFlowModal from "@/components/whatsapp/flows/CreateFlowModal/CreateFlowModal.tsx";
import FlowCardsList from "@/components/whatsapp/flows/FlowCardsList";
import { SyncFlowsButton } from "@/components/whatsapp/flows/SyncFlows";

import styles from "./flows.module.css";

function Flows() {
  const searchParams = useSearchParams();
  const translations = useTranslations();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isCreateFlowModalOpened, setIsCreateFlowModalOpened] = useState(
    searchParams.get("action") === "create",
  );

  const { data: flows, isPending, isError, refetch } = useWaFlowsFromDb();
  const { data: waSettings, isPending: waSettingsPending } = useWaSettings();
  const { isPending: isPendingTeamsUser, data: teamsDataUser } =
    useTeamsByUser();

  const teamsData = teamsDataUser?.data;
  const tourSteps = WaFlowTourSteps({ styles });
  const isLoading = isPending || isPendingTeamsUser || waSettingsPending;
  const hasWaSettings = Boolean(waSettings?.length);
  const handleCreateFlowModalOpen = () => setIsCreateFlowModalOpened(true);
  const handleCreateFlowModalClose = () => setIsCreateFlowModalOpened(false);

  const hasSelectedTeamFilter = Boolean(
    selectedTeamId && selectedTeamId !== "all",
  );

  let filteredFlows = hasSelectedTeamFilter
    ? flows?.filter((flow) =>
        flow.survey.teams.some((team) => team.teamId === selectedTeamId),
      )
    : flows;

  if (searchQuery) {
    filteredFlows = filteredFlows?.filter((flow) =>
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  const sortedFlows = useMemo(
    () => sortData(filteredFlows ?? [], sortOption),
    [filteredFlows, sortOption],
  );

  const shouldShowEmptyState =
    !isLoading && !isError && sortedFlows.length === 0;

  return (
    <>
      <ListPageLayout
        canCreate={hasWaSettings}
        createLabel={translations("Create Flow")}
        createDisabledText={translations(
          "Connect a WhatsApp number in settings to create a Flow",
        )}
        docsUrl="whatsappSurvey/flows"
        isLoading={isLoading}
        queryKeys={["flow", "db"]}
        search={searchQuery}
        searchPlaceholder={translations("Search flows...")}
        tourSteps={tourSteps}
        onCreate={handleCreateFlowModalOpen}
        onSearchChange={setSearchQuery}
        sortValue={sortOption}
        onSortChange={setSortOption}
        isError={isError}
        onRetry={refetch}
        isEmpty={shouldShowEmptyState}
        emptyTitle={
          searchQuery
            ? translations("No results found")
            : translations("No Flows Available")
        }
        emptyDescription={translations(
          "Try adjusting your filters or create a new flow.",
        )}
        rightControls={
          <div className="flex gap-2">
            <TeamSelector
              className={styles["team-select-option"]}
              value={selectedTeamId}
              onChange={(teamId) => setSelectedTeamId(teamId)}
              enableAll={true}
              allowDeselect={false}
              placeholder={translations("Filter by Teams")}
            />

            {hasWaSettings ? (
              <SyncFlowsButton disabled={isLoading} />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SyncFlowsButton disabled />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {translations(
                      "Connect a WhatsApp number in settings to sync a Flow",
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        }
      >
        <div className={styles["flows-list-div"]}>
          <FlowCardsList flows={sortedFlows} teamsData={teamsData} />
        </div>
      </ListPageLayout>

      <CreateFlowModal
        opened={isCreateFlowModalOpened}
        onClose={handleCreateFlowModalClose}
      />
    </>
  );
}

export default Flows;
