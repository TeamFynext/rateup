import {
  Stack,
  Group,
  Title,
  ActionIcon,
  Box,
  Tooltip,
  Text,
  Blockquote,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import React from "react";
import { usePaymentSubcription } from "../../../backend/payment/payment.query";
import styles from "../../../components/adminPanel/admin.module.css";

const RazorpaySubscriptions = () => {
  const {
    data: subscriptions,
    isFetched,
    refetch: refetchSubscribtions,
    isLoading,
  } = usePaymentSubcription();
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
    <Stack mah={"100%"}>
      <Group gap={"md"}>
        <Title order={2}>Razorpay Subscriptions</Title>
        <Tooltip label="Refresh data">
          <ActionIcon
            variant="light"
            ml="xs"
            mr="50px"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              refetchSubscribtions();
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
      <Blockquote color="blue" icon={<IconInfoCircle />}>
        List of Subscriptions from Razorpay DB{" "}
      </Blockquote>
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

export default RazorpaySubscriptions;
