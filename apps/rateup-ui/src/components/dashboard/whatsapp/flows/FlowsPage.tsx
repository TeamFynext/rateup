// Extracted verbatim from the `/dashboard/whatsapp/flows/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconPlus } from "@tabler/icons-react";
import { useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import CreateFlowModal from "@/components/whatsapp/flows/CreateFlowModal/CreateFlowModal.tsx";
import FlowCardsList from "@/components/whatsapp/flows/FlowCardsList/index.tsx";
import { SyncFlowsButton } from "@/components/whatsapp/flows/SyncFlows.tsx";

import styles from "@/components/dashboard/whatsapp/flows/flows.module.css";

export function FlowsPage() {
  const searchParams = useSearch({ strict: false });
  const { t: translations } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isCreateFlowModalOpened, setIsCreateFlowModalOpened] = useState(
    searchParams.action === "create",
  );

  const { data: flows, isPending, isError, refetch } = useWaFlowsFromDb();
  const { data: waSettings, isPending: waSettingsPending } = useWaSettings();
  const { isPending: isPendingTeamsUser, data: teamsDataUser } = useTeamsByUser();

  const teamsData = teamsDataUser?.data;
  const isLoading = isPending || isPendingTeamsUser || waSettingsPending;
  const hasWaSettings = Boolean(waSettings?.length);
  const handleCreateFlowModalOpen = () => setIsCreateFlowModalOpened(true);
  const handleCreateFlowModalClose = () => setIsCreateFlowModalOpened(false);

  const hasSelectedTeamFilter = Boolean(selectedTeamId && selectedTeamId !== "all");

  let filteredFlows = hasSelectedTeamFilter
    ? flows?.filter((flow) => flow.survey?.teams?.some((team) => team.teamId === selectedTeamId))
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

  const shouldShowEmptyState = !isLoading && !isError && sortedFlows.length === 0;

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={handleCreateFlowModalOpen} disabled={!hasWaSettings || isLoading}>
              {translations("Create Flow")}
              <IconPlus size={16} className="ml-2" />
            </Button>
            {!hasWaSettings && (
              <Tooltip>
                <TooltipTrigger render={<div />}></TooltipTrigger>
                <TooltipContent>
                  <p>{translations("Connect a WhatsApp number in settings to create a Flow")}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <RefreshButton queryKeys={["flow", "db"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search flows...")}
              value={searchQuery}
              onChange={setSearchQuery}
            />
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
                  <TooltipTrigger render={<div />}>
                    <SyncFlowsButton disabled />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{translations("Connect a WhatsApp number in settings to sync a Flow")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isLoading}
          isError={isError}
          isEmpty={shouldShowEmptyState}
          emptyTitle={
            searchQuery ? translations("No results found") : translations("No Flows Available")
          }
          emptyDescription={translations("Try adjusting your filters or create a new flow.")}
          onRetry={refetch}
        >
          <div className={styles["flows-list-div"]}>
            <FlowCardsList flows={sortedFlows} teamsData={teamsData ?? []} />
          </div>
        </ListPageContent>
      </ListPage>
      <CreateFlowModal opened={isCreateFlowModalOpened} onClose={handleCreateFlowModalClose} />
    </>
  );
}
