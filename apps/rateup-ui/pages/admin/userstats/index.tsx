import { Group, Stack, Title, Text, Badge, Flex } from "@mantine/core";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import { useAllOrgs } from "../../../backend/org/org.query";
import {
  useGetAllUsers,
  useUpdateRecipeNameMutation,
  useUpdateUserPause,
} from "../../../backend/user/user.query";
import dayjs from "dayjs";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import { showLoadingToast } from "../../../utils/notifications";
import RefreshButton from "../../../components/Button/RefreshButton";
import { formatIsoDateStringWithTime } from "../../../utils/dateTime";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { getUserRoleColor } from "../../../utils";
import UserModal from "./UserModal";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";

const index = () => {
  const { data: orgs } = useAllOrgs();
  const { data: users } = useGetAllUsers();
  const updateRecipeMutation = useUpdateRecipeNameMutation();
  const updatePauseStatus = useUpdateUserPause();
  const rows = users
    ? users?.map((user) => ({
        id: user?.email,
        orgName: user?.orgName,
        role: user?.role,
        signupDate: formatIsoDateStringWithTime(user?.createdAt),
        recipeName: user?.recipeName,
        status: user?.active,
        isPaused: user?.isPaused ? "YES" : "NO",
      }))
    : [];

  const [userStats, setUserStats] = useState({
    today: null,
    lastWeek: null,
    lastMonth: null,
  });

  const [opened, { open, close }] = useDisclosure(false);
  const [
    openedConfirmModal,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);
  const [selectedUser, setSelectedUser] = useState<UserData>(null);
  const [isUpdatedRecipe, setIsUpdatedRecipe] = useState(false);

  const columns: GridColDef[] = [
    { field: "id", headerName: "Email ID", width: 300 },
    {
      field: "orgName",
      headerName: "Organization",
      width: 200,
    },
    {
      field: "role",
      headerName: "Role",
      renderCell: (params: GridRenderCellParams<any, any>) => {
        const role = params.value;
        return <Badge color={getUserRoleColor(role)}>{role}</Badge>;
      },
      width: 200,
    },
    { field: "signupDate", headerName: "SignUp Date", width: 200 },
    { field: "recipeName", headerName: "Recipe", width: 200 },
    { field: "isPaused", headerName: "Is Paused", width: 200 },
    {
      field: "status",
      headerName: "Status",
      renderCell: (params) => {
        const active = params.value;
        return (
          <Badge color={active ? "green" : "red"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
      width: 200,
    },
    {
      field: "action",
      headerName: "Actions",
      type: "actions",
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            params.row.isPaused === "YES" ? (
              <IconPlayerPause size={"1rem"} />
            ) : (
              <IconPlayerPlay size={"1rem"} />
            )
          }
          onClick={() => {
            const user = users?.find((user) => user.email === params.id);
            setSelectedUser(user);
            openConfirmModal();
          }}
          label={params.row.isPaused === "YES" ? "Resume" : "Pause"}
          showInMenu
        />,
      ],
    },
  ];

  const handleUserStatus = () => {
    const data = {
      isPaused: !selectedUser.isPaused,
      pausedBy: "RateUp",
    };
    updatePauseStatus.mutate({ userId: selectedUser.userId, data });
  };

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
      const today = users.filter((user) =>
        dayjs(user.createdAt).isAfter(dayjs().startOf("day")),
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
            setSelectedUser(user);
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
        size="xl"
      >
        <UserModal selectedUser={selectedUser} />
      </FormModalLayout>
      <ConfirmationModal
        opened={openedConfirmModal}
        onClose={closeConfirmModal}
        confirmLabel="Yes"
        headerTitle={selectedUser?.isPaused ? "Resume User" : "Pause User"}
        onConfirm={() => {
          handleUserStatus();
        }}
        headerLabel={`Are you sure to ${selectedUser?.isPaused ? "resume" : "pause"} this user?`}
        closeLabel="cancel"
      />
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

export default index;
