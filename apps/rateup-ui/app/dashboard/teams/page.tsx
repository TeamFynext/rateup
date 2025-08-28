"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Box, Center, Group, Loader, Space } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconReload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useCreateTeamMutation,
  useTeamsByUser,
} from "../../../backend/team/team.query";
import InfoButton from "../../../components/Button/InfoButton";
import {
  RateupButtonBlue,
  RateupButtonOutline,
} from "../../../components/Button/RateupButtons";
import RefreshButton from "../../../components/Button/RefreshButton";
import SortDropdown from "../../../components/Dashboard/SortDropDown";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import TeamTourSteps from "../../../components/WelcomeTour/components/TeamTourSteps";
import styles from "../../../components/WelcomeTour/components/Tour.module.css";
import WelcomeTour from "../../../components/WelcomeTour/WelcomeTour";
import { useUser } from "../../../context/UserContext";
import { docsPath } from "../../../utils/constants";
import { retrieveRole } from "../../../utils/essential";
import TeamCard from "./TeamCard";
import style from "./Teams.module.css";

export default function Teams() {
  const translations = useTranslations();
  const [opened, { open, close }] = useDisclosure(false);
  const [sortOption, setSortOption] = useState("");
  const searchParams = useSearchParams();
  const action = searchParams?.get("action");
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
          return translations("Team Name should be at least 3 characters long");
        }
        return null; // Validation passed
      },
      code: (value) => {
        if (value.length < 2) {
          return translations("Team Code should be at least 2 characters long");
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
      title: translations("Creating Team.."),
      message: `${translations("Hold on, Your team")} '${values?.name}' ${translations("is getting created.")}`,
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
        title={translations("Add Team")}
        buttonTitle={translations("Add Team")}
        isLoading={isCreating}
        onSubmit={createTeamForm.onSubmit(onSubmit)}
      >
        <Box>
          <ContainedTextField
            withAsterisk
            label={translations("Team Name")}
            placeholder={translations("Enter team name")}
            {...createTeamForm.getInputProps("name")}
          />
          <Space h="lg" />
          <ContainedTextField
            withAsterisk
            label={translations("Team Code")}
            placeholder={translations("Enter team code")}
            {...createTeamForm.getInputProps("code")}
          />
        </Box>
      </FormModalLayout>
      <Group gap="md" justify="space-between">
        <Group gap={"md"}>
          {retrieveRole(user?.role) === "Super Admin" && (
            <RateupButtonBlue
              className={styles["create-team-button"]}
              title={translations("Create Team")}
              rightIcon={<IconPlus />}
              onClick={open}
            />
          )}
          <InfoButton docUrl={`${docsPath}/teams/team`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["teamsDataUserQuery"]} />
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
              {translations("Error Try Refreshing")}
              <RateupButtonOutline
                onClick={refetchTeams}
                rightIcon={<IconReload size="1rem" />}
                title={translations("Refresh")}
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
