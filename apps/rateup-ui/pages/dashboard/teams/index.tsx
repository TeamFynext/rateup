import {
  RateupButtonBlue,
  RateupButtonOutline,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import {
  Loader,
  Space,
  Grid,
  Center,
  Group,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { Box } from "@mantine/core";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconRefresh,
  IconReload,
  IconSelector,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useUser } from "../../../context/UserContext";
import { useForm } from "@mantine/form";
import {
  useCreateTeamMutation,
  useTeamsByUser,
} from "../../../backend/team/team.query";
import TeamCard from "./TeamCard";
import { retrieveRole } from "../../../utils/essential";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import Heading from "../../../components/styled/Heading/Heading";
import style from "./Teams.module.css";
import SortDropdown from "../../../components/Dashboard/SortDropDown";
import RefreshButton from "../../../components/Button/RefreshButton";
import InfoButton from "../../../components/Button/InfoButton";
import { docsPath } from "../../../utils/constants";
import styles from "../../../components/WelcomeTour/components/Tour.module.css";
import WelcomeTour from "../../../components/WelcomeTour/WelcomeTour";
import TeamTourSteps from "../../../components/WelcomeTour/components/TeamTourSteps";

export default function Teams() {
  const [opened, { open, close }] = useDisclosure(false);
  const [sortOption, setSortOption] = useState("");
  const { action } = useRouter().query;
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);

  const tourSteps = TeamTourSteps({ styles });

  const createTeamForm = useForm({
    initialValues: {
      name: "",
      code: "",
    },

    validate: {
      name: (value) => {
        if (value.length < 3) {
          return "Team Name should be at least 3 characters long";
        }
        return null; // Validation passed
      },
      code: (value) => {
        if (value.length < 2) {
          return "Team Code should be at least 2 characters long";
        }
        return null; // Validation passed
      },
    },
  });

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    error: errorTeamsDataUser,
    refetch: refetchTeams,
  } = useTeamsByUser() as {
    isLoading: boolean;
    error: any;
    data: TeamsResponse;
    refetch: any;
  };

  const onSubmit = (values) => {
    handleSubmit(values);
  };

  const createTeamMutation = useCreateTeamMutation(
    close,
    createTeamForm,
    setIsCreating,
  );

  const handleSubmit = async (values) => {
    setIsCreating(true);
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Creating Team..",
      message: `Hold on, Your team '${values?.name}' is getting created.`,
      autoClose: false,
      withCloseButton: false,
    });
    createTeamMutation.mutate(values);
  };
  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

  const onSortChange = (value) => {
    setSortOption(value);
  };

  const sortedTeams = () => {
    if (!teamsData?.data) return [];

    switch (sortOption) {
      case "a-z":
        return [...teamsData.data].sort((a, b) => a.name.localeCompare(b.name));
      case "z-a":
        return [...teamsData.data].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return teamsData.data;
    }
  };

  return (
    <div className={style["teams-container"]}>
      <FormModalLayout
        centered
        onClose={close}
        opened={opened}
        title="Add Team"
        buttonTitle="Add Team"
        isLoading={isCreating}
        onSubmit={createTeamForm.onSubmit(onSubmit)}
      >
        <Box>
          <ContainedTextField
            withAsterisk
            label="Team Name"
            placeholder="Enter team name"
            {...createTeamForm.getInputProps("name")}
          />
          <Space h="lg" />
          <ContainedTextField
            withAsterisk
            label="Team Code"
            placeholder="Enter team code"
            {...createTeamForm.getInputProps("code")}
          />
        </Box>
      </FormModalLayout>
      <Group gap="md" justify="space-between">
        <Group gap={"md"}>
          <div className={styles["heading-container"]}>
            <Heading title="Teams" titleprops={{ w: "fit-content" }} />
          </div>
          <InfoButton docUrl={`${docsPath}/teams/team`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["teamsDataUserQuery"]} />
          {retrieveRole(user?.role) === "Super Admin" && (
            <RateupButtonBlue
              className={styles["create-team-button"]}
              title="Create Team"
              rightIcon={<IconPlus />}
              onClick={open}
            />
          )}
        </Group>
        <Group className={styles["sort-dropdown"]}>
          <SortDropdown onSortChange={onSortChange} />
        </Group>
      </Group>

      {isLoadingTeamsUser ? (
        <Center h={"100%"}>
          <Loader type="bars" />
        </Center>
      ) : errorTeamsDataUser ? (
        <Center h={"100%"}>
          {teamsData?.message ? (
            teamsData?.message
          ) : (
            <>
              Error... Try Refreshing...
              <RateupButtonOutline
                onClick={refetchTeams}
                rightIcon={<IconReload size="1rem" />}
                title="Refresh"
                size="xs"
              />
            </>
          )}
        </Center>
      ) : (
        <Box
          className={`${style["team-cards-container"]} cards-grid-global-class`}
        >
          {sortedTeams().map((team, key) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </Box>
      )}
    </div>
  );
}
