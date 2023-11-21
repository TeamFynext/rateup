import { Group } from "@mantine/core";
import { IconPlus, IconSelector } from "@tabler/icons-react";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import { TeamSelector } from "../../input/TeamSelector";
import { StatusFilterMenu } from "../SurveysHome/StatusFilterMenu";
import Heading from "../../styled/Heading/Heading";

export function SurveyHeader({
  selectedTeamId,
  setSelectedTeamId,
  filterParam,
  setFilterParam,
  openCreateSurvey,
  openMergeSurvey,
  sort,
  setSort,
  surveyCount,
  surveyType,
}) {
  const { user } = useUser();
  return (
    <Group gap="md" justify="space-between">
      <Group gap="md" justify="flex-start">
        <Heading
          title={surveyType == "web" ? "Web Surveys" : "WhatsApp Surveys"}
          titleprops={{ w: "fit-content" }}
        />
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

        <RateupButtonPrimary
          onClick={() => setSort(!sort)}
          title={"Sort"}
          variant="subtle"
          rightIcon={<IconSelector size="1rem" />}
        />
      </Group>
    </Group>
  );
}
