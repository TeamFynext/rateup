import { Badge, Flex, Stack } from "@mantine/core";
import {
  DataGrid,
  GridColDef,
  GridPreProcessEditCellProps,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  useGetStripeProducts,
  useSyncStripeProducts,
  useUpdateStripeProduct,
} from "../../../backend/payment/stripe/stripe.query";
import { PaymentPlanStatus } from "../../../types/enums";
import dayjs from "dayjs";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import { IconRefresh } from "@tabler/icons-react";
import classes from "../../../components/Graph/graph.module.css";

const StripeProducts = () => {
  const { data: products } = useGetStripeProducts();
  const updateProductMutate = useUpdateStripeProduct();
  const syncStripeProductMutate = useSyncStripeProducts();
  const columns: GridColDef[] = [
    { field: "id", headerName: "Product ID", width: 200 },
    { field: "name", headerName: "Name", width: 200 },
    { field: "description", headerName: "Description", width: 200 },
    { field: "type", headerName: "Type" },
    { field: "amount", headerName: "Amount" },
    { field: "currency", headerName: "Currency" },
    { field: "interval", headerName: "Interval" },
    { field: "intervalCount", headerName: "Interval Count" },
    {
      field: "livemod",
      headerName: "Live Mode",
      renderCell: (params: GridRenderCellParams<any, any>) => {
        const liveMode = params.value;
        return (
          <Badge color={liveMode ? "green" : "red"}>
            {liveMode ? "Live" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      field: "active",
      headerName: "Active",
      renderCell: (params: GridRenderCellParams<any, any>) => {
        const active = params.value;
        return (
          <Badge color={active ? "green" : "red"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      type: "singleSelect",
      editable: true,
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          updateProductMutate.mutate({
            productId: params.id as string,
            status: params.props.value as PaymentPlanStatus,
          });
        }
        return { ...params.props };
      },
      valueOptions: [
        PaymentPlanStatus.NULL,
        PaymentPlanStatus.LIVE,
        PaymentPlanStatus.ACTIVE,
        PaymentPlanStatus.INACTIVE,
      ],
    },
    { field: "createdAt", headerName: "Created At", width: 200 },
  ];
  const rows = products
    ? products?.map((product) => ({
        id: product.productId,
        name: product.name,
        createdAt: dayjs.unix(product.createdAt).format("DD/MM/YYYY HH:mm:ss"),
        amount: product.amount,
        currency: product.currency,
        intervalCount: product.intervalCount,
        interval: product.interval,
        status: product.status,
        description: product.description,
        type: product.type,
        livemod: product.liveMode,
        active: product.active,
      }))
    : [];

  return (
    <Stack py={"xs"} h={"74vh"}>
      <Flex justify={"flex-end"} py={"xs"}>
        {" "}
        <RateupButtonSecondary
          title="Sync Data"
          leftIcon={
            <IconRefresh
              className={
                syncStripeProductMutate.isPending
                  ? classes.rotateInfinitely
                  : null
              }
              stroke={1.3}
            />
          }
          onClick={() => syncStripeProductMutate.mutate()}
        />
      </Flex>
      <DataGrid rows={rows} columns={columns} />
    </Stack>
  );
};

export default StripeProducts;
