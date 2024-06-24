import { Box, Stack, Group, Blockquote, Text } from "@mantine/core";
import React, { useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridPreProcessEditCellProps,
  GridToolbar,
} from "@mui/x-data-grid";
import styles from "../../../components/adminPanel/admin.module.css";
import {
  useDeletePaymentPlanMutation,
  usePaymentPlanUpdate,
  usePaymentsPlans,
  usePlanSyncMutation,
  useRateupPaymentsPlans,
} from "../../../backend/payment/payment.query";
import dayjs from "dayjs";
import {
  IconInfoCircle,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { PaymentPlanStatus } from "../../../types/enums";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { showErrorToast, showLoadingToast } from "../../../utils/notifications";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import classes from "../../../components/Graph/graph.module.css";
import RefreshButton from "../../../components/Button/RefreshButton";

const RazorpayPlans = () => {
  const syncPlans = usePlanSyncMutation();
  const planUpdateMutate = usePaymentPlanUpdate();
  const { data: rateupPlans, isPending } = useRateupPaymentsPlans();

  const handleUpdatePlans = (updatedData) => {
    planUpdateMutate.mutate(updatedData);
  };
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const deletePaymentPlanMutation = useDeletePaymentPlanMutation();

  const [
    openedDeleteModal,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const handleDeleteClick = () => {
    const planIdLocal = Array.isArray(plans?.data)
      ? plans?.data?.find((plan) => plan?.planId == selectedPlanId)?.id
      : "";
    const planInrateupPlans =
      rateupPlans &&
      rateupPlans?.find((plan) => plan.paymentPlanId === planIdLocal);
    if (planInrateupPlans) {
      showErrorToast(
        "Unable to delete.Plan is in use in rateup plan",
        "plan",
        <IconX />,
        true,
      );
      return;
    }
    deletePaymentPlanMutation.mutate({
      id: planIdLocal,
      planId: selectedPlanId,
    });
  };
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "Razorpay_Plan_ID",
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "name", headerName: "Name", width: 200 },
    { field: "createdAt", headerName: "Created At", width: 150 },
    { field: "amount", headerName: "Amount", width: 100 },
    { field: "currency", headerName: "Currency", width: 100 },
    { field: "period", headerName: "Period", width: 100 },
    { field: "interval", headerName: "Interval", width: 100 },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      editable: true,
      type: "singleSelect",
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (params.hasChanged) {
          const planIdLocal = Array.isArray(plans?.data)
            ? plans?.data?.find((plan) => plan?.planId == params.id).id
            : "";
          handleUpdatePlans({
            id: planIdLocal,
            planId: params.id,
            data: { status: params.props.value as PaymentPlanStatus },
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
    { field: "description", headerName: "Description", width: 150 },
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
              setSelectedPlanId(id as string);
              openDeleteModal();
            }}
            color="inherit"
          />,
        ];
      },
    },
  ];

  const { data: plans, isLoading, isError } = usePaymentsPlans();
  if (isError) return <div>error occured</div>;
  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const rows = Array.isArray(plans?.data)
    ? plans?.data
        ?.filter((p) => p.status !== "INACTIVE")
        ?.map((plan) => ({
          id: plan.planId,
          name: plan.name,
          createdAt: dayjs.unix(plan.createdAt).format("DD/MM/YYYY HH:mm:ss"),
          period: plan.period,
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          status: plan.status,
          description: plan.description,
        }))
    : [];

  return (
    <Stack mah={"100%"} pt={"lg"}>
      <Blockquote color="blue" icon={<IconInfoCircle />} p={"md"}>
        <Group justify="space-between">
          <Group gap={"xs"}>
            <Text>List of plans from Razorpay DB</Text>
            <RefreshButton queryKeys={["paymentPlansQuery"]} />
          </Group>

          <RateupButtonSecondary
            title="Sync"
            leftIcon={
              <IconRefresh
                className={
                  syncPlans.isPending ? classes.rotateInfinitely : null
                }
                stroke={1.3}
              />
            }
            onClick={async () => {
              syncPlans.mutate();
            }}
          />
        </Group>
      </Blockquote>
      <Box h={"52vh"}>
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
      <ConfirmationModal
        opened={openedDeleteModal}
        onClose={closeDeleteModal}
        forDeleteFunctionality
        confirmLabel="Delete"
        headerTitle="Delete RazorPay Plan"
        onConfirm={() => {
          showLoadingToast(
            "Hold on..Plan is getting deleted",
            "plan",
            true,
            "Deleting Plan",
          );
          handleDeleteClick();
        }}
        headerLabel="Are you sure to delete this plan?"
        closeLabel="cancel"
      />
    </Stack>
  );
};

export default RazorpayPlans;
