import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconPlus, IconRefresh, IconSelector } from "@tabler/icons-react";
import { useUser } from "../../../context/UserContext";
import { UserRole } from "../../../utils/enums";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import { TeamSelector } from "../../input/TeamSelector";
import { StatusFilterMenu } from "../SurveysHome/StatusFilterMenu";
import Heading from "../../styled/Heading/Heading";
import { notifications } from "@mantine/notifications";

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
  refetch,
}) {
  const { user } = useUser();
  return (
    <Group gap="md" justify="space-between">
      <Group gap="md" justify="flex-start">
        <Heading
          title={surveyType == "web" ? "Web Surveys" : "WhatsApp Surveys"}
          titleprops={{ w: "fit-content" }}
        />
        <Tooltip label="Refresh data">
          <ActionIcon
            variant="light"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              refetch();
              notifications.show({
                id: "data-reload",
                color: "teal",
                title: "Refreshing data",
                loading: true,
                message: "Hold.. your data is getting update...",
                autoClose: 2000,
              });
            }}
          >
            <IconRefresh style={{ width: "90%", height: "90%" }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
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
