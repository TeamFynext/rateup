import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSurveys } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { SurveyCard } from "@/components/Card/SurveyCard/SurveyCard.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { CreateSurveyModal } from "@/components/Survey/CreateSurveyModal.tsx";
import SurveySectionTabs from "@/components/Survey/SurveySectionTabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { docsPath } from "@/utils/constants.ts";

export const Route = createFileRoute("/dashboard/surveys/")({
  component: Page,
});

interface TeamOption {
  readonly value: string;
  readonly label: string;
}

function Page() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const action = searchParams.action;

  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");
  const [filterParam, setFilterParam] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(action === "create");

  const { t: translations } = useTranslation();
  const debouncedSearch = useDebounce(search.trim(), 200);

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    if (action === "create") {
      navigate({ to: "/dashboard/surveys" });
    }
  };

  const { isLoading, error, data: allSurveys, refetch } = useSurveys();
  const { data: teamRes, isPending: teamsLoading, isError: isTeamsError } = useTeamsByUser();

  const webSurveys = useMemo(() => {
    return Array.isArray(allSurveys) ? allSurveys.filter((s) => s.type === "web") : [];
  }, [allSurveys]);

  const teamOptions = useMemo(() => {
    const teams = teamRes?.data ?? [];
    return teams.map((team) => ({
      value: team.id,
      label: team.name,
    }));
  }, [teamRes?.data]);

  const filteredSurveys = useMemo(() => {
    const searchValue = debouncedSearch.toLowerCase();

    const filtered = webSurveys.filter((survey) => {
      const matchesSearch = !searchValue || survey.title.toLowerCase().includes(searchValue);
      const matchesTeam =
        selectedTeamId === "all" || survey.teams?.some((team: any) => team.id === selectedTeamId);
      const matchesFilter =
        filterParam === "all" ||
        (filterParam === "active" && survey.active) ||
        (filterParam === "paused" && !survey.active);

      return matchesSearch && matchesTeam && matchesFilter;
    });

    return sortData(
      filtered.map((s) => ({ ...s, data: { name: s.title } })),
      sortOption,
    );
  }, [webSurveys, debouncedSearch, selectedTeamId, filterParam, sortOption]);

  return (
    <>
      <SurveySectionTabs />
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {translations("Create Survey")}
            </Button>
            <InfoButton docUrl={`${docsPath}/surveys`} />
            <RefreshButton queryKeys={["surveys"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search surveys...")}
              value={search}
              onChange={setSearch}
            />
            <SurveysPageFilter
              filterParam={filterParam}
              setFilterParam={setFilterParam}
              selectedTeamId={selectedTeamId}
              setSelectedTeamId={setSelectedTeamId}
              teamOptions={teamOptions}
              disabled={teamsLoading || isTeamsError}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isLoading}
          isError={Boolean(error) || isTeamsError}
          isEmpty={!isLoading && !error && !isTeamsError && filteredSurveys.length === 0}
          emptyTitle={translations("No surveys found")}
          emptyDescription={translations("Try changing the filter or create a new survey.")}
          onRetry={() => {
            void refetch();
          }}
        >
          <div className="space-y-4">
            <CardGrid
              items={filteredSurveys}
              getKey={(survey) => survey.id}
              renderItem={(survey) => (
                <SurveyCard
                  survey={survey}
                  selectedTeamId={selectedTeamId}
                  teamsData={teamRes?.data}
                  refetchSurveys={refetch}
                />
              )}
            />
          </div>
        </ListPageContent>
      </ListPage>

      {isCreateDialogOpen && (
        <CreateSurveyModal
          open={isCreateDialogOpen}
          close={closeCreateDialog}
          surveyType="web"
          teamsData={teamRes?.data}
        />
      )}
    </>
  );
}

interface SurveysPageFilterProps {
  readonly filterParam: string;
  readonly setFilterParam: (value: string) => void;
  readonly selectedTeamId: string;
  readonly setSelectedTeamId: (value: string) => void;
  readonly teamOptions: TeamOption[];
  readonly disabled: boolean;
}

function SurveysPageFilter({
  filterParam,
  setFilterParam,
  selectedTeamId,
  setSelectedTeamId,
  teamOptions,
  disabled,
}: Readonly<SurveysPageFilterProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select
        value={filterParam}
        onValueChange={setFilterParam}
        items={[
          { value: "all", label: t("All") },
          { value: "active", label: t("Active") },
          { value: "paused", label: t("Paused") },
        ]}
      >
        <SelectTrigger className="min-w-40">
          <SelectValue placeholder={t("Status")} />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectItem value="all">{t("All")}</SelectItem>
            <SelectItem value="active">{t("Active")}</SelectItem>
            <SelectItem value="paused">{t("Paused")}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={selectedTeamId}
        onValueChange={setSelectedTeamId}
        disabled={disabled}
        items={[{ value: "all", label: t("All Teams") }, ...teamOptions]}
      >
        <SelectTrigger className="min-w-42">
          <div className="flex items-center gap-2 truncate">
            <div className="flex size-7 items-center justify-center rounded-md bg-muted">
              <Users className="size-4 text-muted-foreground" />
            </div>
            <SelectValue placeholder={t("Team")} />
          </div>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectItem value="all">{t("All Teams")}</SelectItem>
            {teamOptions.map((team) => (
              <SelectItem key={team.value} value={team.value}>
                {team.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
