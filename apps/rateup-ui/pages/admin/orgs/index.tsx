import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { ActionIcon, Box, Group, Stack, Title } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import { useAllOrgs } from "../../../backend/org/org.query";
import styles from "../../../components/adminPanel/admin.module.css";
import RefreshButton from "../../../components/Button/RefreshButton";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import {
  formatIsoDateStringWithTime,
  isInLastSevenDays,
  isThisMonth,
  isToday,
  isYesterday,
} from "../../../utils/dateTime";
import { CountStatsCard } from "../userstats";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 220, cellClassName: styles.idCell },
  { field: "name", headerName: "Name", width: 200 },
  { field: "createdAt", headerName: "Created At", width: 200 },
  { field: "owner", headerName: "Owner", width: 150 },
  { field: "ownerEmail", headerName: "Owner Email", width: 200 },
  { field: "teams", headerName: "Teams", width: 100 },
  { field: "members", headerName: "Staff", width: 100 },
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
    yesterday: null,
    lastWeek: null,
    thisMonth: null,
  });

  useEffect(() => {
    if (orgs) {
      const today = orgs.filter((org) => isToday(org.createdAt))?.length;
      const yesterday = orgs.filter((org) =>
        isYesterday(org.createdAt),
      )?.length;
      const lastWeek = orgs.filter((org) =>
        isInLastSevenDays(org.createdAt),
      )?.length;
      const thisMonth = orgs.filter((org) =>
        isThisMonth(org.createdAt),
      )?.length;
      setOrgStats({
        today,
        yesterday,
        lastWeek,
        thisMonth,
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
        <PaperLayout w={500}>
          <Title order={5}>Org Stats</Title>
          <Group justify="space-between" px={"sm"}>
            <CountStatsCard label={"Today"} count={orgStats.today} />
            <CountStatsCard label={"Yesterday"} count={orgStats.yesterday} />
            <CountStatsCard label={"Last Week"} count={orgStats.lastWeek} />
            <CountStatsCard label={"This Month"} count={orgStats.thisMonth} />
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
          showToolbar
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
