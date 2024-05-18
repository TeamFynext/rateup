import { Badge, Flex, Stack } from "@mantine/core";
import { GridColDef, DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { useGetAllStripeSubscriptions } from "../../../backend/payment/stripe/stripe.query";
import dayjs from "dayjs";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import { IconRefresh } from "@tabler/icons-react";
import classes from "../../../components/Graph/graph.module.css";
import { showSuccessToast } from "../../../utils/notifications";

const StripeSubscription = () => {
  const {
    data: subscriptions,
    refetch,
    isRefetching,
  } = useGetAllStripeSubscriptions();
  console.log("subscriptions", subscriptions);
  const columns: GridColDef[] = [
    { field: "id", headerName: "Subscription ID", width: 300 },
    { field: "productName", headerName: "Product Name", width: 200 },
    { field: "amount", headerName: "Amount" },
    { field: "currency", headerName: "Currency" },
    {
      field: "status",
      headerName: "Status",
      renderCell: (params: GridRenderCellParams<any, any>) => {
        return <Badge>{params.value}</Badge>;
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
    <Stack py={"xs"} h={"74vh"}>
      <Flex justify={"flex-end"} py={"xs"}>
        <RateupButtonSecondary
          title="Refresh Data"
          leftIcon={
            <IconRefresh
              className={isRefetching ? classes.rotateInfinitely : null}
              stroke={1.3}
            />
          }
          onClick={async () => {
            await refetch();
            showSuccessToast("Updated Successfully");
          }}
        />
      </Flex>
      <DataGrid rows={rows} columns={columns} />
    </Stack>
  );
};

export default StripeSubscription;
