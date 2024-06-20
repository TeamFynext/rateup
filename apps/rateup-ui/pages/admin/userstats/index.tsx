import {
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Flex,
  Avatar,
  Divider,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
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
import {
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import classes from "../../../components/Graph/graph.module.css";

const index = () => {
  const {
    data: orgs,
    refetch: refetchOrgs,
    isRefetching: isOrgRefetching,
  } = useAllOrgs();
  const { data: users, refetch, isRefetching } = useGetAllUsers();
  const updateRecipeMutation = useUpdateRecipeNameMutation();
  const rows = users
    ? users?.map((user) => ({
        id: user?.email,
        orgNames: user?.org?.map((org) => org.name),
        signupDate: dayjs(user?.createdAt).format("DD/MM/YYYY hh:mm A"),
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
        return (
          <Group>
            {orgs.map((orgName, index) => (
              <Badge key={index} color={stringToColour(orgName)} p={"xs"}>
                {orgName}
              </Badge>
            ))}
          </Group>
        );
      },
      width: 300,
    },
    { field: "signupDate", headerName: "SignUp Date", width: 200 },
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
  return (
    <Stack>
      <Flex gap={"xl"} pr={"lg"}>
        <Group flex={1} align="flex-start">
          <Title order={2}>User Stats</Title>
          <Tooltip label="Refresh data">
            <ActionIcon
              variant="light"
              onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
                await Promise.all([refetch(), refetchOrgs()]);
                showSuccessToast(
                  "Data updated successfully",
                  "",
                  <IconCheck />,
                );
              }}
            >
              <IconRefresh
                style={{ width: "80%", height: "80%" }}
                className={
                  isRefetching || isOrgRefetching
                    ? classes.rotateInfinitely
                    : null
                }
                stroke={1.5}
              />
            </ActionIcon>
          </Tooltip>
        </Group>
        <RateupButtonBlue
          title="Update User Recipe"
          onClick={handleUpdateUserRecipe}
          disabled={isUpdatedRecipe}
        />
        <PaperLayout w={300}>
          <Title order={4}>Total</Title>
          <Group justify="space-between" p={"sm"}>
            <Stack gap={1} align="center">
              <Title>{orgs?.length}</Title>
              <Text fw={600} c={"dimmed"}>
                Organizations
              </Text>
            </Stack>
            <Stack gap={1} align="center">
              <Title>{users?.length}</Title>
              <Text fw={600} c={"dimmed"}>
                Users
              </Text>
            </Stack>
          </Group>
        </PaperLayout>
        <PaperLayout w={400}>
          <Title order={4}>User Stats</Title>
          <Group justify="space-between" p={"sm"}>
            <Stack gap={1} align="center">
              <Title>{userStats.today}</Title>
              <Text fw={600} c={"dimmed"}>
                Today
              </Text>
            </Stack>
            <Stack gap={1} align="center">
              <Title>{userStats.lastWeek}</Title>
              <Text fw={600} c={"dimmed"}>
                Last Week
              </Text>
            </Stack>
            <Stack gap={1} align="center">
              <Title>{userStats.lastMonth}</Title>
              <Text fw={600} c={"dimmed"}>
                Last Month
              </Text>
            </Stack>
          </Group>
        </PaperLayout>
      </Flex>
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
            setSelectedUser(users?.find((user) => user.email === params.id));
            open();
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

const UserModal = ({ selectedUser }) => {
  return (
    <Stack>
      <Group>
        <Avatar
          src={
            `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${selectedUser.profilePhoto}` ??
            null
          }
          size={"lg"}
        />
        <Stack gap={1}>
          <Title order={3}>{selectedUser?.name}</Title>
          <Text c={"dimmed"}>{selectedUser?.id}</Text>
        </Stack>
      </Group>
      <PaperLayout>
        <Title order={4}>Organizations</Title>
        <Divider my={"sm"} />
        {selectedUser?.org.map((org, index) => (
          <>
            <Group key={index}>
              <Avatar
                src={
                  `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${org.logo}` ??
                  null
                }
                size={"md"}
              />
              <Stack gap={1}>
                <Title order={5}>{org?.name}</Title>
                <Text c={"dimmed"}>{org?.id}</Text>
              </Stack>
            </Group>
            {index !== selectedUser?.org.length - 1 && <Divider my={"sm"} />}
          </>
        ))}
      </PaperLayout>
    </Stack>
  );
};

export default index;
