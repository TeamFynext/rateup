import { Badge, Blockquote, Text, Group, Stack } from "@mantine/core";
import { GridColDef, DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { useGetAllStripeSubscriptions } from "../../../backend/payment/stripe/stripe.query";
import dayjs from "dayjs";
import { IconInfoCircle } from "@tabler/icons-react";
import RefreshButton from "../../../components/Button/RefreshButton";

const StripeSubscription = () => {
  const {
    data: subscriptions,
    refetch,
    isRefetching,
  } = useGetAllStripeSubscriptions();

  const columns: GridColDef[] = [
    { field: "id", headerName: "Subscription ID", width: 300 },
    { field: "productName", headerName: "Product Name", width: 200 },
    { field: "amount", headerName: "Amount" },
    { field: "currency", headerName: "Currency" },
    {
      field: "status",
      headerName: "Status",
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
    { field: "createdAt", headerName: "Created At", width: 200 },
    { field: "startsAt", headerName: "Starts At", width: 200 },
    { field: "endsAt", headerName: "Ends At", width: 200 },
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
            <Text>List of subscriptions from stripe DB</Text>
            <RefreshButton queryKeys={["stripeSubscriptions"]} />
          </Group>
        </Group>
      </Blockquote>
      <DataGrid rows={rows} columns={columns} />
    </Stack>
  );
};

export default StripeSubscription;
