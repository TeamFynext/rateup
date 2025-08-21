import { Box, Group, Stack, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { usePaymentOrders } from "../../backend/payment/payment.query";
import styles from "../../components/adminPanel/admin.module.css";
import RefreshButton from "../../components/Button/RefreshButton";

const Orders = () => {
  const {
    data: allOrders,
    isFetched,
    refetch: refetchOrders,
    isLoading,
  } = usePaymentOrders();
  const translations = useTranslations();
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: translations("Razorpay_Order_ID"),
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "name", headerName: translations("Name"), width: 200 },
    {
      field: "orgname",
      headerName: translations("Organization Name"),
      width: 150,
    },
    { field: "subId", headerName: translations("Subscription Id"), width: 200 },
    {
      field: "status",
      headerName: "Status",
      width: 150,
    },
    { field: "createdBy", headerName: translations("Ordered By"), width: 220 },
    { field: "createdAt", headerName: translations("Ordered At"), width: 150 },
  ];
  const rows = isFetched
    ? allOrders?.map((order) => ({
        id: order.id,
        name: order?.name,
        orgname: order?.org?.name || "DELETED ORG",
        subId: order.subscriptionId,
        status: order?.status,
        createdBy:
          order?.createdBy?.name || order?.createdBy?.email || "DELETED",
        createdAt: dayjs(order.createdAt).format("DD/MM/YYYY HH:mm:ss"),
      }))
    : [];
  if (isLoading) {
    notifications.show({
      id: "load-data",
      color: "teal",
      title: translations("Loading data"),
      loading: true,
      message: translations("Hold.. your data is getting loaded..."),
      autoClose: 2000,
    });
  }
  return (
    <Stack mah={"100%"}>
      <Group gap={"md"}>
        <Title order={2}>{translations("Orders")}</Title>
        <RefreshButton queryKeys={["paymentorders"]} />
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
