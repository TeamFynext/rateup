import {
  Box,
  Stack,
  Title,
  Group,
  Tooltip,
  ActionIcon,
  Blockquote,
} from "@mantine/core";
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
} from "../../../backend/payment/payment.query";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconRefresh, IconTrash } from "@tabler/icons-react";
import { PaymentPlanStatus } from "../../../types/enums";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { showLoadingToast } from "../../../utils/notifications";

const RazorpayPlans = () => {
  const syncPlans = usePlanSyncMutation();
  const planUpdateMutate = usePaymentPlanUpdate();

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
    <Stack mah={"100%"} py={"md"}>
      <Group gap={"md"}>
        <Title order={4}>Razorpay Plans</Title>
        <Tooltip label="Refresh data">
          <ActionIcon
            variant="light"
            ml="xs"
            mr="50px"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              syncPlans.mutate();
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
      <Blockquote color="blue" icon={<IconInfoCircle />} p={"md"}>
        List of plans from Razorpay DB{" "}
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
