import { Button, Group, Title, useMantineTheme } from "@mantine/core";
import { IconPlus, IconSelector } from "@tabler/icons-react";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { TeamSelector } from "../../input/TeamSelector";
import { StatusFilterMenu } from "../SurveysHome/StatusFilterMenu";

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
}) {
  const { user } = useUser();
  const theme = useMantineTheme();
  return (
    <Group gap="md" justify="space-between">
      <Group gap="md" justify="flex-start">
        <Title order={1}>All Surveys</Title>
        {user?.role !== UserRole.MEMBER && (
          <Button
            rightSection={<IconPlus />}
            radius="xl"
            size="sm"
            onClick={openCreateSurvey}
            color={theme.colors[theme.primaryColor][6]} // TODO: find out why primaryColor is not being applied automatically
          >
            Create Survey
          </Button>
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
