import {
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Flex,
  Avatar,
  Divider,
} from "@mantine/core";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import { useAllOrgs } from "../../../backend/org/org.query";
import {
  useGetAllUsers,
  useUpdateRecipeNameMutation,
} from "../../../backend/user/user.query";
import dayjs from "dayjs";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { stringToColour } from "../../../utils/essential";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import { Users } from "../../../backend/user/user.api";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import { showLoadingToast } from "../../../utils/notifications";
import RefreshButton from "../../../components/Button/RefreshButton";
import { formatIsoDateStringWithTime } from "../../../utils/dateTime";

const index = () => {
  const { data: orgs } = useAllOrgs();
  const { data: users } = useGetAllUsers();
  const updateRecipeMutation = useUpdateRecipeNameMutation();
  const rows = users
    ? users?.map((user) => ({
        id: user?.email,
        orgNames: user?.org?.map((org) => org.name),
        roles: user?.orgMember?.map((r) => {
          const orgName = orgs?.find((org) => org?.id == r.orgId)?.name;
          return `${r.role} at ${orgName}`;
        }),
        signupDate: formatIsoDateStringWithTime(user?.createdAt),
        recipeName: user?.recipeName,
      }))
    : [];

  const [userStats, setUserStats] = useState({
    today: null,
    lastWeek: null,
    lastMonth: null,
  });

  const [opened, { open, close }] = useDisclosure(false);
  const [selectedUser, setSelectedUser] = useState<Users>(null);
  const [isUpdatedRecipe, setIsUpdatedRecipe] = useState(false);

  const columns: GridColDef[] = [
    { field: "id", headerName: "Email ID", width: 300 },
    {
      field: "orgNames",
      headerName: "Organizations",
      renderCell: (params: GridRenderCellParams<any, any>) => {
        const orgs = params.value;
        return <BadgeArrayCell array={orgs} />;
      },
      width: 300,
    },
    {
      field: "roles",
      headerName: "User Roles",
      renderCell: (params: GridRenderCellParams<any, any>) => {
        const roles = params.value;
        return <BadgeArrayCell array={roles} />;
      },
      width: 200,
    },
    { field: "signupDate", headerName: "SignUp Date", width: 200 },
    { field: "recipeName", headerName: "Recipe", width: 200 },
  ];
  const handleUpdateUserRecipe = () => {
    showLoadingToast(
      "Recipes getting updated",
      "user-recipe",
      true,
      "Updating..",
    );
    updateRecipeMutation.mutate();
  };
  useEffect(() => {
    if (users) {
      const today = users.filter(
        (user) => dayjs().diff(user.createdAt, "days") == 0,
      )?.length;
      const lastWeek = users.filter(
        (user) => dayjs().diff(user.createdAt, "week") == 0,
      )?.length;
      const lastMonth = users.filter(
        (user) => dayjs().diff(user.createdAt, "month") == 0,
      )?.length;
      setUserStats({
        today,
        lastWeek,
        lastMonth,
      });
      //To check is all users recipe name has updated
      setIsUpdatedRecipe(
        users.filter((user) => !user.recipeName)?.length ? false : true,
      );
    }
  }, [users]);

  const BadgeArrayCell = ({ array }) => {
    return (
      <Group>
        {array?.map((element, index) => (
          <Badge key={index} color={stringToColour(element)} p={"xs"}>
            {element}
          </Badge>
        ))}
      </Group>
    );
  };
  return (
    <Stack gap={"xs"}>
      <Flex gap={"xl"} pr={"lg"}>
        <Group flex={1} align="flex-start">
          <Title order={2}>User Stats</Title>
          <RefreshButton queryKeys={["allUsers", "org"]} />
        </Group>
        <RateupButtonBlue
          title="Update User Recipe"
          onClick={handleUpdateUserRecipe}
          disabled={isUpdatedRecipe}
        />
        <PaperLayout w={300}>
          <Title order={4}>Total</Title>
          <Group justify="space-between" p={"sm"}>
            <CountStatsCard label={"Organizations"} count={orgs?.length} />
            <CountStatsCard label={"Users"} count={users?.length} />
          </Group>
        </PaperLayout>
        <PaperLayout w={400}>
          <Title order={4}>User Stats</Title>
          <Group justify="space-between" p={"sm"}>
            <CountStatsCard label={"Today"} count={userStats.today} />
            <CountStatsCard label={"Last Week"} count={userStats.lastWeek} />
            <CountStatsCard label={"Last Month"} count={userStats.lastMonth} />
          </Group>
        </PaperLayout>
      </Flex>
      <Title order={4}>Most Recent SignUps</Title>
      <Box
        sx={{
          height: "57vh",
          width: "100%",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => {
            const user = users?.find((user) => user.email === params.id);
            const userOrgs = user?.org?.map((org) =>
              orgs?.find((or) => or.id === org.id),
            );
            setSelectedUser({ ...user, org: userOrgs });
            open();
          }}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
        />
      </Box>
      <FormModalLayout
        centered
        opened={opened}
        onClose={close}
        title=""
        size="lg"
      >
        <UserModal selectedUser={selectedUser} />
      </FormModalLayout>
    </Stack>
  );
};

export const CountStatsCard = ({ label, count }) => {
  return (
    <Stack gap={1} align="center">
      <Title>{count}</Title>
      <Text fw={600} c={"dimmed"}>
        {label}
      </Text>
    </Stack>
  );
};

const UserModal = ({ selectedUser }) => {
  return (
    <Stack gap={"xl"}>
      <Group justify="space-around">
        <Stack gap={1}>
          <Avatar
            src={
              `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${selectedUser.profilePhoto}` ??
              null
            }
            size={"xl"}
          />
          <Title order={4}>{selectedUser?.name}</Title>
        </Stack>
        <Stack>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              Email ID
            </Text>
            <Text size="sm" c={"dimmed"}>
              {selectedUser?.email}
            </Text>
          </Group>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              User ID
            </Text>
            <Text size="sm" c={"dimmed"}>
              {" "}
              {selectedUser?.id}
            </Text>
          </Group>
          <Group gap={1}>
            <Text fw={600} size="sm" w={110}>
              Phone Number
            </Text>
            <Text size="sm" c={"dimmed"}>
              {selectedUser?.phone ?? "---"}
            </Text>
          </Group>
        </Stack>
      </Group>

      <PaperLayout>
        <Title order={3}>Organizations</Title>
        <Divider my={"sm"} />
        {selectedUser?.org.map((org, index) => {
          const role = selectedUser?.orgMember?.find(
            (or) => or.orgId == org?.id,
          )?.role;
          return (
            <Stack key={index}>
              <Group justify="space-around">
                <Stack gap={1}>
                  <Avatar
                    src={
                      `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${org.logo}` ??
                      null
                    }
                    size={"lg"}
                  />
                  <Title order={5}>{org?.name}</Title>
                  <Text size="xs" c={"dimmed"}>
                    {role}
                  </Text>
                </Stack>
                <Stack>
                  <Group gap={1}>
                    <Text fw={600} size="sm" w={110}>
                      Org ID
                    </Text>
                    <Text size="sm" c={"dimmed"}>
                      {org?.id}
                    </Text>
                  </Group>
                  <Group gap={1}>
                    <Text fw={600} size="sm" w={110}>
                      Phone Number
                    </Text>
                    <Text size="sm" c={"dimmed"}>
                      {" "}
                      {org?.phone ?? "---"}
                    </Text>
                  </Group>
                  <Group gap={1}>
                    <Text fw={600} size="sm" w={110}>
                      Address
                    </Text>
                    <Text size="sm" c={"dimmed"}>
                      {org?.address ?? "---"}
                    </Text>
                  </Group>
                </Stack>
              </Group>
              {index !== selectedUser?.org.length - 1 && <Divider my={"sm"} />}
            </Stack>
          );
        })}
      </PaperLayout>
    </Stack>
  );
};

export default index;
