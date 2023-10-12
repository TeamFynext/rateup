import {
  RateupButtonBlue,
  RateupButtonOutline,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import {
  Flex,
  Title,
  Loader,
  Space,
  Grid,
  Center,
  SimpleGrid,
  Group,
} from "@mantine/core";
import { Box } from "@mantine/core";
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
import { QueryClient, dehydrate, useQueryClient } from "@tanstack/react-query";
import { backendConfig } from "../../../config/backendConfig";
import { GetServerSidePropsContext } from "next";
import supertokensNode from "supertokens-node";
import { fetchTeamsByUserWithCustomToken } from "../../../backend/team/team.api";
import { checkTokenExpiry } from "../../../utils/supertoken";
import { retrieveRole } from "../../../utils/essential";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import { getSessionWithRefreshHandling } from "../../../utils/auth/getSessionWithRefreshHandling";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const queryClient = new QueryClient();

  try {
    supertokensNode.init(backendConfig());

    const accessToken = await getSessionWithRefreshHandling(context);

    await queryClient.prefetchQuery({
      queryKey: ["teamsDataUserQuery"],
      queryFn: () => fetchTeamsByUserWithCustomToken(accessToken),
    });

    return {
      props: {
        dehydratedState: dehydrate(queryClient),
      },
    };
  } catch (err) {
    console.log(err);
    return {
      props: {
        dehydratedState: dehydrate(queryClient),
      },
    };
  }
}

export default function Teams() {
  const [opened, { open, close }] = useDisclosure(false);
  const [sort, setSort] = useState(false);
  const { action } = useRouter().query;
  const { user, setUser } = useUser();
  const queryClient = useQueryClient();
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
  return (
    <>
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
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
      >
        <Group gap={"md"}>
          <Title order={1}>Teams</Title>
          {retrieveRole(user?.role) === "Super Admin" && (
            <RateupButtonBlue
              title="Add Team"
              rightIcon={<IconPlus />}
              radius="xl"
              size="lg"
              onClick={open}
            />
          )}
        </Group>
        <RateupButtonPrimary
          onClick={() => setSort(!sort)}
          title={"Sort"}
          variant="subtle"
          rightIcon={<IconSelector size="1rem" />}
        />
      </Flex>

      <Space h="xl" />

      {user?.role === "ADMIN" || user?.role === "MEMBER" ? (
        <SimpleGrid
          spacing={"lg"}
          cols={{ base: 4, sm: 1, md: 2, lg: 2, xl: 3 }}
        >
          {teamsData?.data
            ? teamsData?.data?.map((team, i: number) => (
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
              <Grid columns={9} p={10} h="100%" style={{ overflow: "auto" }}>
                {teamsData?.data?.length > 0 ? (
                  (sort
                    ? [...teamsData?.data]?.sort((a, b) =>
                        b.teamName.localeCompare(a.teamName),
                      )
                    : [...teamsData?.data]?.sort((a, b) =>
                        a.teamName.localeCompare(b.teamName),
                      )
                  ).map((team, key) => (
                    <Grid.Col span={{ xs: 9, md: 4.5, lg: 3 }} key={key}>
                      <TeamCard key={team.teamId} team={team} />
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
        </>
      )}
    </>
  );
}
