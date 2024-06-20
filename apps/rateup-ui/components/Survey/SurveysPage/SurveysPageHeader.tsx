import { Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import { TeamSelector } from "../../input/TeamSelector";
import { StatusFilterMenu } from "../SurveysHome/StatusFilterMenu";
import Heading from "../../styled/Heading/Heading";
import SortDropdown from "../../Dashboard/SortDropDown";
import InfoButton from "../../Button/InfoButton";
import { docsPath } from "../../../utils/constants";
import RefreshButton from "../../Button/RefreshButton";

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
  refetch,
}) {
  const { user } = useUser();

  return (
    <Group gap="md" justify="space-between">
      <Group gap="md" justify="flex-start">
        <Group mr="md">
          <Heading
            title={surveyType == "web" ? "Web Surveys" : "WhatsApp Surveys"}
            titleprops={{ w: "fit-content" }}
          />

          {surveyType == "web" && (
            <InfoButton docUrl={`${docsPath}/webSurvey`} />
          )}
        </Group>

        <RefreshButton queryKey="surveys" />
        {user?.role !== UserRole.MEMBER && (
          <RateupButtonBlue
            rightIcon={<IconPlus />}
            title="Create Survey"
            onClick={openCreateSurvey}
          />
        )}
      </Group>

      <Group gap="md" justify="flex-start">
        {surveyCount > 0 && (
          <RateupButtonPrimary
            title="Group survey"
            onClick={() => openMergeSurvey()}
          />
        )}
        <TeamSelector
          value={selectedTeamId}
          onChange={(teamId) => setSelectedTeamId(teamId)}
          enableAll={true}
        />
        <StatusFilterMenu
          filterParam={filterParam}
          setFilterParam={setFilterParam}
        />
        <SortDropdown
          onSortChange={onSortChange}
          defaultSortOption={sortOption}
        />
      </Group>
    </Group>
  );
}
