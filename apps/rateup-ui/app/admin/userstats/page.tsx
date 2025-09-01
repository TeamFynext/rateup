"use client";

import { useEffect, useState } from "react";

import { Badge, Box, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import { useTranslations } from "next-intl";

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
import { getUserRoleColor, getUserRoleLabel } from "../../../utils";
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
  const translations = useTranslations();
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
    { field: "id", headerName: translations("Email ID"), width: 300 },
    { field: "name", headerName: translations("Name"), width: 200 },
    {
      field: "orgName",
      headerName: translations("Organization"),
      width: 200,
    },
    {
      field: "role",
      headerName: translations("Role"),
      renderCell: (params: GridRenderCellParams<any, any>) => {
        const role = params.value;
        return (
          <Badge color={getUserRoleColor(role)}>
            {getUserRoleLabel(role, translations)}
          </Badge>
        );
      },
      width: 200,
    },
    {
      field: "signupDate",
      headerName: translations("SignUp Date"),
      width: 200,
    },
    { field: "recipeName", headerName: translations("Recipe"), width: 200 },
    { field: "isPaused", headerName: translations("Is Paused"), width: 200 },
    {
      field: "status",
      headerName: translations("Status"),
      renderCell: (params) => {
        const active = params.value;
        return (
          <Badge color={active ? "green" : "red"}>
            {active ? translations("Active") : translations("Inactive")}
          </Badge>
        );
      },
      width: 200,
    },
    {
      field: "action",
      headerName: translations("Actions"),
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
          label={
            params.row.isPaused === "YES"
              ? translations("Resume")
              : translations("Pause")
          }
          showInMenu
          key={params.id + "pause-action"}
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
      translations("Recipes getting updated"),
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
          <Title order={2}>{translations("User Stats")}</Title>
          <RefreshButton queryKeys={["allUsers", "org"]} />
        </Group>
        <RateupButtonBlue
          title={translations("Update User Recipe")}
          onClick={handleUpdateUserRecipe}
          disabled={isUpdatedRecipe}
        />
        <PaperLayout w={300}>
          <Title order={5}>{translations("Total")}</Title>
          <Group justify="space-between" px={"sm"}>
            <CountStatsCard
              label={translations("Organizations")}
              count={orgs?.length}
            />
            <CountStatsCard
              label={translations("Users")}
              count={users?.length}
            />
          </Group>
        </PaperLayout>
        <PaperLayout w={500}>
          <Title order={5}>User Stats</Title>
          <Group justify="space-between" px={"sm"}>
            <CountStatsCard
              label={translations("Today")}
              count={userStats.today}
            />
            <CountStatsCard
              label={translations("Yesterday")}
              count={userStats.yesterday}
            />
            <CountStatsCard
              label={translations("Last 7 days")}
              count={userStats.lastWeek}
            />
            <CountStatsCard
              label={translations("This Month")}
              count={userStats.thisMonth}
            />
          </Group>
        </PaperLayout>
      </Flex>
      <Title order={4}>{translations("Most Recent SignUps")}</Title>
      <Box h={"60vh"} w={"100%"}>
        <DataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => {
            const user = users?.find((user) => user.email === params.id);
            setSelectedUser(user);
            open();
          }}
          showToolbar
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
        headerTitle={
          selectedUser?.isPaused
            ? translations("Resume User")
            : translations("Pause User")
        }
        onConfirm={() => {
          handleUserStatus();
        }}
        headerLabel={` ${translations("Are you sure to")} ${selectedUser?.isPaused ? translations("resume") : translations("pause")} ${translations("this user?")}`}
        closeLabel={translations("cancel")}
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
