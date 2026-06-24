import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";

import SortDropdown from "../../dashboard/SortDropDown.tsx";
import { TeamSelector } from "../../input/TeamSelector.tsx";
import { StatusFilterMenu } from "../SurveysHome/StatusFilterMenu.tsx";

export function SurveyHeader({
  selectedTeamId,
  setSelectedTeamId,
  filterParam,
  setFilterParam,
  openCreateSurvey,
  openMergeSurvey,
  onSortChange,
  sortOption,
  surveyCount,
  surveyType,
  setSearchQuery,
  searchQuery,
  refetch,
}) {
  const { user } = useUser();
  const { t: translations } = useTranslation();

  return (
    <div className="border-b px-4 sm:px-6 py-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Section (Create button) */}
        {user?.role !== UserRole.MEMBER && (
          <Button onClick={openCreateSurvey} className="bg-primary shadow-sm h-9 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {translations("Create Survey")}
          </Button>
        )}

        {/* Right Section (Filters / Search) */}
        <div className="flex flex-col sm:flex-row items-start justify-center gap-3">
          {/* Team Selector */}
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
            className="w-full"
          />

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Status Filter */}
            <StatusFilterMenu filterParam={filterParam} setFilterParam={setFilterParam} />

            {/* Sorting */}
            <SortDropdown onSortChange={onSortChange} defaultSortOption={sortOption} />
          </div>

          {/* Search Input */}
          <div className="flex w-full">
            <Input
              placeholder={translations("Search Surveys")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 flex-1"
            />
            <Button variant="outline" size="icon" className="h-9 w-9 ml-2">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
