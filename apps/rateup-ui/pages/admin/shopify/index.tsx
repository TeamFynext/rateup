import { useState } from "react";

import { Box, Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";

import { IntegratedApps } from "@/types/enums";
import { useGetAllIntegrations } from "@/backend/appsIntegration/integration.query";
import { useDeleteShopifyIntegrationByShop } from "@/backend/appsIntegration/shopify/shopify.query";
import styles from "@/components/adminPanel/admin.module.css";
import RefreshButton from "@/components/Button/RefreshButton";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { ActiveStatusBadge } from "@/pages/dashboard/apps&services/shopify";
import { formatIsoDateStringWithTime } from "@/utils/dateTime";
import { showLoadingToast } from "@/utils/notifications";

const index = () => {
  const { data: integrations } = useGetAllIntegrations();
  const [selectedShop, setSelectedShop] = useState("");
  const [opened, { open: openConfirmModal, close }] = useDisclosure(false);
  const deleteIntegration = useDeleteShopifyIntegrationByShop();

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
    {
      field: "action",
      headerName: "Actions",
      type: "actions",
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<IconTrash />}
          onClick={() => {
            setSelectedShop(params.row.shop);
            openConfirmModal();
          }}
          label="Delete"
          showInMenu
        />,
      ],
    },
  ];

  const handleDelete = () => {
    showLoadingToast("Deleting...", "integration");
    deleteIntegration.mutate({ shop: selectedShop });
  };
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
      <ConfirmationModal
        confirmLabel="Yes"
        headerLabel="Are you sure, you want to delete it?"
        headerTitle="Delete"
        onClose={close}
        onConfirm={handleDelete}
        forDeleteFunctionality
        opened={opened}
        closeLabel="No"
      />
    </Stack>
  );
};

export default index;
