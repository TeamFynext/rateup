import { Badge, Blockquote, Group, Stack, Text } from "@mantine/core";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridPreProcessEditCellProps,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  useDeleteStripeProduct,
  useGetStripeProducts,
  useSyncStripeProducts,
  useUpdateStripeProduct,
} from "../../../backend/payment/stripe/stripe.query";
import { PaymentPlanStatus } from "../../../types/enums";
import dayjs from "dayjs";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import {
  IconInfoCircle,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import classes from "../../../components/Graph/graph.module.css";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { showErrorToast, showLoadingToast } from "../../../utils/notifications";
import { useState } from "react";
import { useRateupPaymentsPlans } from "../../../backend/payment/payment.query";
import RefreshButton from "../../../components/Button/RefreshButton";

const StripeProducts = () => {
  const { data: products, isRefetching, refetch } = useGetStripeProducts();
  const updateProductMutate = useUpdateStripeProduct();
  const syncStripeProductMutate = useSyncStripeProducts();
  const deleteStripeProduct = useDeleteStripeProduct();
  const { data: rateupPlans, isPending, isError } = useRateupPaymentsPlans();
  const [
    openedDeleteModal,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [productId, setProductId] = useState("");

  const handleDeleteProduct = () => {
    const product =
      products && products?.find((prod) => prod.productId == productId);
    const productInRateupPlan =
      rateupPlans &&
      rateupPlans?.find((plan) => plan?.stripeId === product?.id);
    if (productInRateupPlan) {
      showErrorToast(
        "Unable to delete. Product is in use in rateup plan",
        "stripe",
        <IconX />,
        true,
      );
      return;
    }
    deleteStripeProduct.mutate(productId);
  };

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
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: ({ id, row }) => {
        return [
          <GridActionsCellItem
            icon={<IconTrash />}
            label="Delete"
            disabled={[
              PaymentPlanStatus.ACTIVE,
              PaymentPlanStatus.LIVE,
            ].includes(row.status)}
            onClick={() => {
              setProductId(id as string);
              openDeleteModal();
            }}
            color="inherit"
          />,
        ];
      },
    },
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
    <Stack pt={"lg"} h={"74vh"}>
      <Blockquote color="blue" icon={<IconInfoCircle />} p={"md"}>
        <Group justify="space-between">
          <Group gap={"xs"}>
            <Text>List of products from Stripe DB</Text>
            <RefreshButton queryKeys={["stripeProducts"]} />
          </Group>
          <RateupButtonSecondary
            title="Sync"
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
        </Group>
      </Blockquote>
      <DataGrid rows={rows} columns={columns} />
      <ConfirmationModal
        opened={openedDeleteModal}
        onClose={closeDeleteModal}
        forDeleteFunctionality
        confirmLabel="Delete"
        headerTitle="Delete Stripe Product"
        onConfirm={() => {
          showLoadingToast(
            "Hold on..Stripe Product is getting deleted",
            "stripe",
            true,
            "Deleting Stripe product",
          );
          handleDeleteProduct();
        }}
        headerLabel="Are you sure to delete this stripe product?"
        closeLabel="cancel"
      />
    </Stack>
  );
};

export default StripeProducts;
