import { Stack, Group, Box, Text, Blockquote } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { IconInfoCircle } from "@tabler/icons-react";
import React from "react";
import { usePaymentSubcription } from "../../../backend/payment/payment.query";
import styles from "../../../components/adminPanel/admin.module.css";
import RefreshButton from "../../../components/Button/RefreshButton";

const RazorpaySubscriptions = () => {
  const { data: subscriptions, isFetched, isLoading } = usePaymentSubcription();
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "Razorpay_Subscription_ID",
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "planName", headerName: "Plan Name", width: 200 },
    { field: "amount", headerName: "Amount", width: 100 },
    { field: "currency", headerName: "Currency", width: 100 },
    {
      field: "status",
      headerName: "Status",
      width: 150,
    },
    { field: "createdAt", headerName: "Created At", width: 150 },
    { field: "start", headerName: "Starts At", width: 150 },
    { field: "end", headerName: "Ends At", width: 150 },
  ];
  const rows = isFetched ? subscriptions : [];
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
    <Stack mah={"100%"} pt={"lg"}>
      <Blockquote color="blue" icon={<IconInfoCircle />} p={"md"}>
        <Group justify="space-between">
          <Group gap={"xs"}>
            <Text>List of Subscriptions from Razorpay DB</Text>
            <RefreshButton queryKeys={["paymentsubscription"]} />
          </Group>
        </Group>
      </Blockquote>
      <Box h="52vh">
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

export default RazorpaySubscriptions;
