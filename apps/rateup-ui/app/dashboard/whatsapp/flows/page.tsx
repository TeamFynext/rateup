"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useTranslations } from "next-intl";
import { IconPlus, IconSearch, IconBook } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { FlowCardListSkeleton } from "@/components/animation/skeleton/wa/FlowCardList.skeleton";
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
  const searchParams = useSearchParams();
  const translations = useTranslations();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isCreateFlowModalOpened, setIsCreateFlowModalOpened] = useState(
    searchParams.get("action") === "create"
  );

  const { data: flows, isPending, isError, refetch } = useWaFlowsFromDb();
  const { data: waSettings, isPending: waSettingsPending } = useWaSettings();
  const { isPending: isPendingTeamsUser, data: teamsDataUser } = useTeamsByUser();

  const teamsData = teamsDataUser?.data;
  const tourSteps = WaFlowTourSteps({ styles });
  const isLoading = isPending || isPendingTeamsUser || waSettingsPending;

  const handleCreateFlowModalOpen = () => setIsCreateFlowModalOpened(true);
  const handleCreateFlowModalClose = () => setIsCreateFlowModalOpened(false);

  const ComponentToBeRendered = () => {
    if (isLoading) return <FlowCardListSkeleton />;
    if (isError)
      return <ErrorComponent refetch={refetch} isRefetching={isPending} />;

    // Filter by Team
    let filteredMenus =
      selectedTeamId === "all" || !selectedTeamId
        ? flows
        : flows?.filter((flow) =>
          flow.survey.teams.some((team) => team.teamId === selectedTeamId),
        );

    // Filter by Search Query
    if (searchQuery) {
      filteredMenus = filteredMenus?.filter((flow) =>
        flow.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (!filteredMenus?.length && !searchQuery)
      return <NothingFound text={translations("No Flows Available")} />;
    if (!filteredMenus?.length && searchQuery)
      return <NothingFound text={translations("No results found")} />;

    filteredMenus = filteredMenus.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return (
      <div className={styles["flows-list-div"]}>
        <FlowCardsList flows={filteredMenus} teamsData={teamsData} />
      </div>
    );
  };
  return (
    <div className={styles["flows-list-page-container"]}>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-medium">{translations("WhatsApp Flow Builder")}</h2>
            <p className="text-sm text-muted-foreground">{translations("Create and manage WhatsApp conversation flows")}</p>
          </div>
          {!waSettings ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      className={styles["create-button"]}
                      onClick={handleCreateFlowModalOpen}
                      disabled={isLoading || !waSettings}
                    >
                      <IconPlus size={16} className="mr-2" />
                      {translations("Create Flow")}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{translations("Connect a WhatsApp number in settings to create a Flow")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              className={styles["create-button"]}
              onClick={handleCreateFlowModalOpen}
              disabled={isLoading}
            >
              <IconPlus size={16} className="mr-2" />
              {translations("Create Flow")}
            </Button>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="relative" style={{ width: '650px' }}>
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={translations("Search flows...")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 bg-[#eaecefff] border-none rounded-sm"
            />
          </div>
          <div className="flex gap-2">
            <TeamSelector
              className={styles["team-select-option"]}
              value={selectedTeamId}
              onChange={(teamId) => setSelectedTeamId(teamId)}
              enableAll={true}
              allowDeselect={false}
              placeholder={translations("Filter by Teams")}
            />
            <Button
              variant="outline"
              onClick={() => window.open(`${docsPath}/whatsappSurvey/flows`, "_blank")}
            >
              <IconBook size={16} className="mr-2" />
              {translations("Documentation")}
            </Button>
            <WelcomeTour steps={tourSteps} />
            <RefreshButton queryKeys={["flow", "db"]} />

            {!waSettings ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <SyncFlowsButton disabled={!waSettings} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{translations("Connect a WhatsApp number in settings to sync a Flow")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <SyncFlowsButton disabled={false} />
            )}
          </div>
        </div>
      </div>

      <ComponentToBeRendered />

      <CreateFlowModal
        opened={isCreateFlowModalOpened}
        onClose={handleCreateFlowModalClose}
      />
    </div>
  );
}

export default Flows;
