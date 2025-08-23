import { Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useUser } from "../../../context/UserContext";
import { docsPath } from "../../../utils/constants";
import { UserRole } from "../../../utils/enums";
import InfoButton from "../../Button/InfoButton";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import RefreshButton from "../../Button/RefreshButton";
import SortDropdown from "../../Dashboard/SortDropDown";
import { TeamSelector } from "../../input/TeamSelector";
import Heading from "../../styled/Heading/Heading";
import styles from "../../WelcomeTour/components/Tour.module.css";
import WebSurveyTourSteps from "../../WelcomeTour/components/WebSurveyTourSteps";
import WelcomeTour from "../../WelcomeTour/WelcomeTour";
import { StatusFilterMenu } from "../SurveysHome/StatusFilterMenu";

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
  const translations = useTranslations();
  const tourSteps = WebSurveyTourSteps({ styles });

  return (
    <Group gap="sm" justify="space-between">
      <Group gap="sm" justify="flex-start">
        {user?.role !== UserRole.MEMBER && (
          <RateupButtonBlue
            className={styles["create-survey-button"]}
            rightIcon={<IconPlus />}
            title={translations("Create Survey")}
            onClick={openCreateSurvey}
          />
        )}
        <InfoButton docUrl={`${docsPath}/webSurvey`} />
        <WelcomeTour steps={tourSteps} />
        <RefreshButton queryKeys={["surveys"]} />
      </Group>

      <Group gap="md" justify="flex-start">
        {surveyCount > 0 && (
          <RateupButtonPrimary
            title={translations("Group survey")}
            onClick={() => openMergeSurvey()}
          />
        )}
        <TeamSelector
          className={styles["team-select-option"]}
          value={selectedTeamId}
          onChange={(teamId) => setSelectedTeamId(teamId)}
          enableAll={true}
        />
        <StatusFilterMenu
          filterParam={filterParam}
          setFilterParam={setFilterParam}
        />
        <Group className={styles["sort-dropdown"]}>
          <SortDropdown
            onSortChange={onSortChange}
            defaultSortOption={sortOption}
          />
        </Group>
      </Group>
    </Group>
  );
}
