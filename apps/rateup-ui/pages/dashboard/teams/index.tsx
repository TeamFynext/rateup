import {
  RateupButtonOutline,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import {
  Flex,
  Title,
  Loader,
  Space,
  Paper,
  Grid,
  Text,
  Stack,
  Center,
  SimpleGrid,
} from "@mantine/core";
import { Box, Modal, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconReload, IconSelector } from "@tabler/icons-react";
import { useRouter } from "next/router";
import CardButton from "../../../components/Card";
import { useUser } from "../../../context/UserContext";
import { useForm } from "@mantine/form";
import {
  useCreateTeamMutation,
  useTeamsByUser,
} from "../../../backend/team/team.query";
import TeamCard from "./TeamCard";
import { useQueryClient } from "@tanstack/react-query";
import { backendConfig } from "../../../config/backendConfig";
import { GetServerSidePropsContext } from "next";
import supertokensNode from "supertokens-node";
import { fetchTeamsByUserWithCustomToken } from "../../../backend/team/team.api";

export default function Teams({ teamData: initialTeamData }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [sort, setSort] = useState(false);
  const { action } = useRouter().query;
  const { user, setUser } = useUser();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

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
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser(queryClient, initialTeamData);

  let teamsData = initialTeamData || teamsDataUser?.data;

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

  return (
    <>
      <Modal opened={opened} onClose={close} title="Create Team" centered>
        <form onSubmit={createTeamForm.onSubmit(onSubmit)}>
          <Box>
            <TextInput
              withAsterisk
              label="Name"
              placeholder="Enter team name"
              {...createTeamForm.getInputProps("name")}
            />
            <TextInput
              withAsterisk
              label="Code"
              placeholder="Enter team code"
              {...createTeamForm.getInputProps("code")}
            />
          </Box>
          <Box pt={20}>
            <RateupButtonPrimary
              loading={isCreating}
              type="submit"
              title={"Create"}
            />
          </Box>
        </form>
      </Modal>

      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
      >
        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <Title order={1}>Teams</Title>
          {user?.role === "ADMIN" || user?.role === "MEMBER" ? (
            <p>You can view all your teams.</p>
          ) : (
            <p>
              You can view all the teams under your organization. Also create
              new teams from here.
            </p>
          )}
        </Flex>

        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={"Sort"}
            variant="subtle"
            rightIcon={<IconSelector size="1rem" />}
          />
        </Flex>
      </Flex>

      <Space h="xl" />

      {user?.role === "ADMIN" || user?.role === "MEMBER" ? (
        <SimpleGrid
          spacing={"lg"}
          cols={{ base: 4, sm: 1, md: 2, lg: 2, xl: 3 }}
        >
          {teamsDataUser?.data?.data
            ? teamsDataUser?.data?.data?.map((team, i: number) => (
                <CardButton key={i} title={team?.teamName}></CardButton>
              ))
            : "No teams found."}
        </SimpleGrid>
      ) : (
        //TODO optimize
        //For Super Admin
        <>
          {isLoadingTeamsUser ? (
            <Loader />
          ) : (
            <>
              <Grid>
                <Grid.Col span="content">
                  <Paper
                    p="md"
                    shadow="lg"
                    radius="lg"
                    style={{
                      cursor: "pointer",
                      width: "250px",
                      height: "140px",
                    }}
                    onClick={open}
                  >
                    <Center h="100%">
                      <Stack align="center">
                        <IconPlus size={36} />
                        <Text size="xl" fw={700}>
                          Add Team
                        </Text>
                      </Stack>
                    </Center>
                  </Paper>
                </Grid.Col>

                {teamsData?.data?.length > 0 ? (
                  (sort
                    ? [...teamsData?.data]
                        ?.sort((a, b) => a.id - b.id)
                        .reverse()
                    : [...teamsData?.data]?.sort((a, b) => a.id - b.id)
                  ).map((team, key) => (
                    <Grid.Col span="content" key={key}>
                      <TeamCard
                        key={team.teamId}
                        team={team}
                        reftchTeams={reftchTeams}
                      />{" "}
                    </Grid.Col>
                  ))
                ) : (
                  <Center>
                    {" "}
                    {teamsData?.message ? (
                      teamsData?.message
                    ) : (
                      <>
                        {" "}
                        Error... Try Refreshing...{" "}
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
        </>
      )}
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig());

    let accessToken =
      context.req.cookies["st-access-token"] ||
      context.req.cookies["sAccessToken"];
    if (!accessToken) {
      return { props: { teamData: [] } };
    }

    const teamData = await fetchTeamsByUserWithCustomToken(accessToken);

    return {
      props: {
        teamData: teamData || null,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      props: {
        teamData: [],
      },
    };
  }
}
