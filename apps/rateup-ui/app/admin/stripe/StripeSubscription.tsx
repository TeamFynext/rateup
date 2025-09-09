"use client";

import { Badge, Blockquote, Group, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { useGetAllStripeSubscriptions } from "../../../backend/payment/stripe/stripe.query";
import RefreshButton from "../../../components/Button/RefreshButton";

const StripeSubscription = () => {
  const translations = useTranslations();
  const {
    data: subscriptions,
    refetch,
    isRefetching,
  } = useGetAllStripeSubscriptions();

  const columns: GridColDef[] = [
    { field: "id", headerName: translations("Subscription ID"), width: 300 },
    {
      field: "productName",
      headerName: translations("Product Name"),
      width: 200,
    },
    { field: "amount", headerName: translations("Amount") },
    { field: "currency", headerName: translations("Currency") },
    {
      field: "status",
      headerName: translations("Status"),
      renderCell: (params: GridRenderCellParams<any, any>) => {
        return (
          <Badge
            color={
              ["active", "trialing"].includes(params.value) ? "green" : "red"
            }
          >
            {params.value}
          </Badge>
        );
      },
      width: 200,
    },
    { field: "createdAt", headerName: translations("Created At"), width: 200 },
    { field: "startsAt", headerName: translations("Starts At"), width: 200 },
    { field: "endsAt", headerName: translations("Ends At"), width: 200 },
  ];
  const rows = subscriptions
    ? subscriptions?.map((sub) => ({
        ...sub,
        createdAt: dayjs.unix(sub.createdAt).format("DD/MM/YYYY HH:mm:ss"),
        startsAt: dayjs.unix(sub.startsAt).format("DD/MM/YYYY HH:mm:ss"),
        endsAt: dayjs.unix(sub.endsAt).format("DD/MM/YYYY HH:mm:ss"),
      }))
    : [];
  return (
    <Stack pt={"lg"} h={"74vh"}>
      <Blockquote icon={<IconInfoCircle />} color="blue" p={"md"}>
        <Group justify="space-between">
          <Group gap={"xs"}>
            <Text>{translations("List of subscriptions from stripe DB")}</Text>
            <RefreshButton queryKeys={["stripeSubscriptions"]} />
          </Group>
        </Group>
      </Blockquote>
      <DataGrid rows={rows} columns={columns} />
    </Stack>
  );
};

export default StripeSubscription;
