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
import styles from "../../WelcomeTour/components/Tour.module.css";
import WelcomeTour from "../../WelcomeTour/WelcomeTour";
import WebSurveyTourSteps from "../../WelcomeTour/components/WebSurveyTourSteps";

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

  const tourSteps = WebSurveyTourSteps({ styles });

  return (
    <Group gap="sm" justify="space-between">
      <Group gap="sm" justify="flex-start">
        <Group mr="sm">
          <div className={styles["heading-container"]}>
            <Heading
              title={surveyType == "web" ? "Web Surveys" : "WhatsApp Surveys"}
              titleprops={{ w: "fit-content" }}
            />
          </div>
          {surveyType == "web" && (
            <InfoButton docUrl={`${docsPath}/webSurvey`} />
          )}
        </Group>
        <WelcomeTour steps={tourSteps} />
        <RefreshButton queryKeys={["surveys"]} />
        {user?.role !== UserRole.MEMBER && (
          <RateupButtonBlue
            className={styles["create-survey-button"]}
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
