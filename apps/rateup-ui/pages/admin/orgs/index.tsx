import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import { useAllOrgs } from "../../../backend/org/org.query";
import { ActionIcon, Box, Group, Stack, Title } from "@mantine/core";
import dayjs from "dayjs";
import styles from "../../../components/adminPanel/admin.module.css";
import { IconArrowRight } from "@tabler/icons-react";
import { useRouter } from "next/router";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { CountStatsCard } from "../userstats";
import { useEffect, useState } from "react";
import RefreshButton from "../../../components/Button/RefreshButton";
import { formatIsoDateStringWithTime } from "../../../utils/dateTime";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 220, cellClassName: styles.idCell },
  { field: "name", headerName: "Name", width: 200 },
  { field: "createdAt", headerName: "Created At", width: 200 },
  { field: "owner", headerName: "Owner", width: 150 },
  { field: "ownerEmail", headerName: "Owner Email", width: 200 },
  { field: "teams", headerName: "Teams", width: 100 },
  { field: "members", headerName: "Members", width: 100 },
  { field: "invitations", headerName: "Invitations", width: 100 },
  {
    field: "actions",
    headerName: "Actions",
    width: 100,
    renderCell: renderActions,
  },
];

function renderActions(params: GridRenderCellParams<any, Org>) {
  const router = useRouter();
  return (
    <Group>
      <ActionIcon
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/admin/orgs/${params.row.id}`);
        }}
      >
        <IconArrowRight />
      </ActionIcon>
    </Group>
  );
}
export default function OrgDisplay() {
  const { data: orgs, isLoading, isError } = useAllOrgs();
  const [orgStats, setOrgStats] = useState({
    today: null,
    lastWeek: null,
    lastMonth: null,
  });

  useEffect(() => {
    if (orgs) {
      const today = orgs.filter(
        (user) => dayjs().diff(user.createdAt, "days") == 0,
      )?.length;
      const lastWeek = orgs.filter(
        (user) => dayjs().diff(user.createdAt, "week") == 0,
      )?.length;
      const lastMonth = orgs.filter(
        (user) => dayjs().diff(user.createdAt, "month") == 0,
      )?.length;
      setOrgStats({
        today,
        lastWeek,
        lastMonth,
      });
    }
  }, [orgs]);

  if (isError) return <div>error occured</div>;
  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const rows = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    createdAt: formatIsoDateStringWithTime(o.createdAt),
    owner: o.owner.name,
    ownerEmail: o.owner.email,
    members: o._count.members,
    teams: o._count.teams,
    invitations: o._count.invitations,
  }));

  return (
    <Stack mah={"100%"}>
      <Group justify="space-between">
        <Group flex={1}>
          <Title>Orgs</Title>
          <RefreshButton queryKeys={["org"]} />
        </Group>

        <PaperLayout w={200} py={28}>
          <CountStatsCard label={"Organizations"} count={orgs?.length} />
        </PaperLayout>
        <PaperLayout w={400}>
          <Title order={5}>Org Stats</Title>
          <Group justify="space-between" px={"sm"}>
            <CountStatsCard label={"Today"} count={orgStats.today} />
            <CountStatsCard label={"Last Week"} count={orgStats.lastWeek} />
            <CountStatsCard label={"Last Month"} count={orgStats.lastMonth} />
          </Group>
        </PaperLayout>
      </Group>
      <Box h="65vh">
        <DataGrid
          rows={rows}
          columns={columns}
          getRowHeight={() => "auto"}
          disableColumnSelector
          disableDensitySelector
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
    </Stack>
  );
}
