import { useEffect, useState } from "react";

import { Badge, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { Box } from "@mui/material";
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
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import RefreshButton from "../../../components/Button/RefreshButton";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { getUserRoleColor } from "../../../utils";
import {
  formatIsoDateStringWithTime,
  isInLastSevenDays,
  isThisMonth,
  isToday,
  isYesterday,
} from "../../../utils/dateTime";
import { showLoadingToast } from "../../../utils/notifications";
import UserModal from "./UserModal";

const index = () => {
  const { data: orgs } = useAllOrgs();
  const { data: users } = useGetAllUsers();
  const updateRecipeMutation = useUpdateRecipeNameMutation();
  const updatePauseStatus = useUpdateUserPause();
  const rows = users
    ? users?.map((user) => ({
        id: user?.email,
        name: user?.userName,
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
    yesterday: null,
    lastWeek: null,
    thisMonth: null,
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
    { field: "name", headerName: "Name", width: 200 },
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
      pausedBy: "rateup",
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
      const today = users.filter((user) => isToday(user?.createdAt))?.length;
      const yesterday = users.filter((user) =>
        isYesterday(user.createdAt),
      )?.length;
      const lastWeek = users.filter((user) =>
        isInLastSevenDays(user?.createdAt),
      )?.length;
      const thisMonth = users.filter((user) =>
        isThisMonth(user?.createdAt),
      )?.length;
      setUserStats({
        today,
        yesterday,
        lastWeek,
        thisMonth,
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
          <Title order={5}>Total</Title>
          <Group justify="space-between" px={"sm"}>
            <CountStatsCard label={"Organizations"} count={orgs?.length} />
            <CountStatsCard label={"Users"} count={users?.length} />
          </Group>
        </PaperLayout>
        <PaperLayout w={500}>
          <Title order={5}>User Stats</Title>
          <Group justify="space-between" px={"sm"}>
            <CountStatsCard label={"Today"} count={userStats.today} />
            <CountStatsCard label={"Yesterday"} count={userStats.yesterday} />
            <CountStatsCard label={"Last 7 days"} count={userStats.lastWeek} />
            <CountStatsCard label={"This Month"} count={userStats.thisMonth} />
          </Group>
        </PaperLayout>
      </Flex>
      <Title order={4}>Most Recent SignUps</Title>
      <Box
        sx={{
          height: "60vh",
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
