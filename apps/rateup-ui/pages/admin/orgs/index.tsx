import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import { useAllOrgs } from "../../../backend/org/org.query";
import { ActionIcon, Box, Group, Stack } from "@mantine/core";
import dayjs from "dayjs";
import styles from "../../../components/adminPanel/admin.module.css";
import { IconArrowRight } from "@tabler/icons-react";
import { useRouter } from "next/router";
import RateupLoader from "../../../components/Loaders/RateupLoader";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 220, cellClassName: styles.idCell },
  { field: "name", headerName: "Name", width: 200 },
  { field: "createdAt", headerName: "Created At", width: 150 },
  { field: "owner", headerName: "Owner", width: 150 },
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
  if (isError) return <div>error occured</div>;
  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const rows = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    createdAt: dayjs(o.createdAt).format("YYYY/MM/DD"),
    owner: o.owner.name,
    members: o._count.members,
    teams: o._count.teams,
    invitations: o._count.invitations,
  }));

  return (
    <Stack mah={"100%"}>
      <h1>Orgs</h1>
      <Box h="75vh">
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
