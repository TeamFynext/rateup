import { Box, Group, Stack, Title } from "@mantine/core";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";

import { IntegratedApps } from "@/types/enums";
import { useGetAllIntegrations } from "@/backend/appsIntegration/integration.query";
import styles from "@/components/adminPanel/admin.module.css";
import RefreshButton from "@/components/Button/RefreshButton";
import { ActiveStatusBadge } from "@/pages/dashboard/apps&services/shopify";
import { formatIsoDateStringWithTime } from "@/utils/dateTime";

const index = () => {
  const { data: integrations } = useGetAllIntegrations();

  const rows = integrations
    ? integrations
        .filter((integration) => integration.name === IntegratedApps.shopify)
        ?.map((integration) => ({
          id: integration.id,
          shop: integration.credential.session.shop,
          orgId: integration.orgId,
          createdAt: formatIsoDateStringWithTime(integration.createdAt),
          status: integration.active,
        }))
    : [];
  const columns: GridColDef[] = [
    { field: "id", headerName: "Id", width: 250, cellClassName: styles.idCell },
    { field: "shop", headerName: "Shop", width: 250 },
    {
      field: "orgId",
      headerName: "Org Id",
      width: 250,
      cellClassName: styles.idCell,
    },
    {
      field: "status",
      headerName: "Status",
      width: 200,
      renderCell: (params: GridRenderCellParams<any, any>) => {
        return <ActiveStatusBadge active={params.value} />;
      },
    },
    { field: "createdAt", headerName: "Created At", width: 200 },
  ];
  return (
    <Stack>
      <Group>
        <Title order={2}>Integrated Shopify Stores</Title>
        <RefreshButton queryKeys={["integrations"]} />
      </Group>
      <Box h={"70vh"}>
        <DataGrid
          columns={columns}
          rows={rows}
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
};

export default index;
