import React from "react";
import { useUser } from "../../../context/UserContext";
import { useRouter } from "next/router";
import {
  Flex,
  Badge,
  Title,
  Stack,
  Grid,
  Select,
  Loader,
  Table,
  Text,
  Paper,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import {
  useTeamsMembersOfOrg,
  useUpdateRoleMutation,
} from "../../../backend/org/org.query";
import { backendConfig } from "../../../config/backendConfig";
import supertokensNode from "supertokens-node";
import { notifications } from "@mantine/notifications";
import { getSurveyWithCustomToken } from "../../../backend/org/org.api";
import { GetServerSidePropsContext } from "next";
import { checkTokenExpiry } from '../../../utils/supertoken';

const Members = ({ membersData: membersInitialData }) => {
  const router = useRouter();
  const { user, setUser } = useUser();
  const theme = useMantineTheme();

  if (user?.role === "ADMIN" || user?.role === "MEMBER") {
    router.push("/dashboard");
  }

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsMembersOfOrg(membersInitialData);

  const updateRole = useUpdateRoleMutation();

  function onChangeRole(id, role) {
    const data = { memberId: id, body: { role: role } };
    updateRole.mutate(data);

    notifications.show({
      id: "load-data",
      loading: true,
      title: "Updating role..",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });
  }

  let membersData = membersInitialData || teamsDataUser?.data;

  const rows = membersData?.data?.map((team, i) => (
    <tr key={i}>
      <td>
        <Stack align="center">
          <Title order={3}>{team?.team_name}</Title>

          <Badge color={theme.colors.blue[9]} variant="outline">
            {team?.team_code}{" "}
          </Badge>
        </Stack>
      </td>

      <td>
        {team?.members?.map((member, j: number) => (
          <Stack key={j}>
            <Grid style={{ minWidth: "600px" }} py="lg" align="center">
              <Grid.Col span={3}>{member?.name}</Grid.Col>
              <Grid.Col span={5}>{member?.email}</Grid.Col>
              <Grid.Col span={4}>
                <Select
                  placeholder="Select a role"
                  data={[
                    { value: "SUPER_ADMIN", label: "Super Admin" },
                    { value: "ADMIN", label: "Admin" },
                    { value: "MEMBER", label: "Member" },
                  ]}
                  value={member?.role}
                  disabled={member?.id === user?.userId}
                  onChange={(value) => onChangeRole(member?.id, value)}
                />
              </Grid.Col>
            </Grid>
            {j !== team?.members.length - 1 && (
              <Divider my="sm" variant="dashed" />
            )}
          </Stack>
        ))}
      </td>
    </tr>
  ));

  return (
    <Flex mih={50} gap="md" justify="space-between" direction="row" wrap="wrap">
      <Flex
        mih={50}
        gap="md"
        justify="flex-start"
        align="flex-start"
        direction="column"
        wrap="wrap"
      >
        <Title order={1}>Members</Title>
        <Text> List of all teams and their members list.</Text>

        <Paper p="md" radius="md">
          {isLoadingTeamsUser ? (
            <Loader />
          ) : (
            <Table
              horizontalSpacing="xl"
              verticalSpacing="lg"
              //fontSize="md"
              style={{ fontSize: "20px" }}
              mt="lg"
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
            >
              <thead>
                <tr>
                  <th>
                    {" "}
                    <Text> Teams </Text>
                  </th>
                  <th>
                    <Grid style={{ minWidth: "600px" }}>
                      <Grid.Col span={3}>Member</Grid.Col>
                      <Grid.Col span={5}>Email</Grid.Col>
                      <Grid.Col span={4}>Role</Grid.Col>
                    </Grid>
                  </th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </Table>
          )}
        </Paper>
      </Flex>
    </Flex>
  );
};

export default Members;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig());

    let accessToken =
      context.req.cookies["st-access-token"] ||
      context.req.cookies["sAccessToken"];
    if (!accessToken) {
      return { props: { membersData: [] } };
    }

    const membersData = await getSurveyWithCustomToken(accessToken);

    const tokenExpiryCheck = checkTokenExpiry([membersData]);
    if (tokenExpiryCheck) {
      return tokenExpiryCheck;
    }

    return {
      props: {
        membersData: membersData || null,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      props: {
        membersData: [],
      },
    };
  }
}
