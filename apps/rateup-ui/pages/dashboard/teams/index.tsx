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
import styles from "./Teams.module.css";
import SortDropdown from "../../../components/Dashboard/SortDropDown";
import RefreshButton from "../../../components/Button/RefreshButton";
import InfoButton from "../../../components/Button/InfoButton";
import { docsPath } from "../../../utils/constants";

export default function Teams() {
  const [opened, { open, close }] = useDisclosure(false);
  const [sortOption, setSortOption] = useState("");
  const { action } = useRouter().query;
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);

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
    refetch: reftchTeams,
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
    <div className={styles["teams-container"]}>
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
          <Heading title="Teams" titleprops={{ w: "fit-content" }} />
          <InfoButton docUrl={`${docsPath}/teams/team`} />
          <RefreshButton queryKey="teamsDataUserQuery" />
          {retrieveRole(user?.role) === "Super Admin" && (
            <RateupButtonBlue
              title="Create Team"
              rightIcon={<IconPlus />}
              onClick={open}
            />
          )}
        </Group>
        <SortDropdown onSortChange={onSortChange} />
      </Group>
      <Space h="lg" />
      {isLoadingTeamsUser ? (
        <Loader type="bars" />
      ) : (
        <>
          <Grid columns={9} p={10} className={styles["team-cards-container"]}>
            {sortedTeams().length > 0 ? (
              sortedTeams().map((team, key) => (
                <Grid.Col span={{ base: 9, md: 4.5, lg: 3 }} key={key}>
                  <TeamCard key={team.id} team={team} />
                </Grid.Col>
              ))
            ) : (
              <Center>
                {teamsData?.message ? (
                  teamsData?.message
                ) : (
                  <>
                    Error... Try Refreshing...
                    <RateupButtonOutline
                      onClick={reftchTeams}
                      rightIcon={<IconReload size="1rem" />}
                      title="Refresh"
                      size="xs"
                    />
                  </>
                )}
              </Center>
            )}
          </Grid>
        </>
      )}
    </div>
  );
}
