import React from "react";

import { Blockquote, Box, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useTranslations } from "next-intl";

import { usePaymentSubcription } from "../../../backend/payment/payment.query";
import styles from "../../../components/adminPanel/admin.module.css";
import RefreshButton from "../../../components/Button/RefreshButton";

const RazorpaySubscriptions = () => {
  const { data: subscriptions, isFetched, isLoading } = usePaymentSubcription();
  const translations = useTranslations();
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: translations("Razorpay_Subscription_ID"),
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "planName", headerName: translations("Plan Name"), width: 200 },
    { field: "amount", headerName: translations("Amount"), width: 100 },
    { field: "currency", headerName: translations("Currency"), width: 100 },
    {
      field: "status",
      headerName: translations("Status"),
      width: 150,
    },
    { field: "createdAt", headerName: translations("Created At"), width: 150 },
    { field: "start", headerName: translations("Starts At"), width: 150 },
    { field: "end", headerName: translations("Ends At"), width: 150 },
  ];
  const rows = isFetched ? subscriptions : [];
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
    <Stack mah={"100%"} pt={"lg"}>
      <Blockquote color="blue" icon={<IconInfoCircle />} p={"md"}>
        <Group justify="space-between">
          <Group gap={"xs"}>
            <Text>
              {translations("List of Subscriptions from Razorpay DB")}
            </Text>
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
};

export default RazorpaySubscriptions;
