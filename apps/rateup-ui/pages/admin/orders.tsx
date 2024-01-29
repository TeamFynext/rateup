import { Stack, Group, Title, ActionIcon, Tooltip, Box } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { IconRefresh } from "@tabler/icons-react";
import { usePaymentOrders } from "../../backend/payment/payment.query";
import styles from "../../components/adminPanel/admin.module.css";
import dayjs from "dayjs";

const Orders = () => {
  const {
    data: allOrders,
    isFetched,
    refetch: refetchOrders,
    isLoading,
  } = usePaymentOrders();
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "Razorpay_Order_ID",
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "name", headerName: "Name", width: 200 },
    { field: "orgname", headerName: "Organization Name", width: 150 },
    { field: "subId", headerName: "Subscription Id", width: 200 },
    {
      field: "status",
      headerName: "Status",
      width: 150,
    },
    { field: "createdBy", headerName: "Ordered By", width: 220 },
    { field: "createdAt", headerName: "Ordered At", width: 150 },
  ];
  const rows = isFetched
    ? allOrders?.map((order) => ({
        id: order.id,
        name: order.name,
        orgname: order.org.name,
        subId: order.subscriptionId,
        status: order.status,
        createdBy: order.createdBy.name || order.createdBy.email,
        createdAt: dayjs(order.createdAt).format("DD/MM/YYYY HH:mm:ss"),
      }))
    : [];
  if (isLoading) {
    notifications.show({
      id: "load-data",
      color: "teal",
      title: "Loading data",
      loading: true,
      message: "Hold.. your data is getting loaded...",
      autoClose: 2000,
    });
  }
  return (
    <Stack mah={"100%"}>
      <Group gap={"md"}>
        <Title order={2}>Orders</Title>
        <Tooltip label="Refresh data">
          <ActionIcon
            variant="light"
            ml="xs"
            mr="50px"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              refetchOrders();
              notifications.show({
                id: "load-data",
                color: "teal",
                title: "Refreshing data",
                loading: true,
                message: "Hold.. your data is getting update...",
                autoClose: 2000,
              });
            }}
          >
            <IconRefresh style={{ width: "80%", height: "80%" }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Group>
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
};

export default Orders;
