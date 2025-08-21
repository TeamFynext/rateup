import React, { useState } from "react";

import { Blockquote, Box, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconInfoCircle,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridPreProcessEditCellProps,
} from "@mui/x-data-grid";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import {
  useDeletePaymentPlanMutation,
  usePaymentPlanUpdate,
  usePaymentsPlans,
  usePlanSyncMutation,
  useRateupPaymentsPlans,
} from "../../../backend/payment/payment.query";
import styles from "../../../components/adminPanel/admin.module.css";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import RefreshButton from "../../../components/Button/RefreshButton";
import classes from "../../../components/Graph/graph.module.css";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { PaymentPlanStatus } from "../../../types/enums";
import { showErrorToast, showLoadingToast } from "../../../utils/notifications";

const RazorpayPlans = () => {
  const syncPlans = usePlanSyncMutation();
  const planUpdateMutate = usePaymentPlanUpdate();
  const { data: rateupPlans, isPending } = useRateupPaymentsPlans();
  const translations = useTranslations();
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
        translations("Unable to delete.Plan is in use in rateup plan"),
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
      headerName: translations("Razorpay_Plan_ID"),
      width: 220,
      cellClassName: styles.idCell,
    },
    { field: "name", headerName: translations("Name"), width: 200 },
    { field: "createdAt", headerName: translations("Created At"), width: 150 },
    { field: "amount", headerName: translations("Amount"), width: 100 },
    { field: "currency", headerName: translations("Currency"), width: 100 },
    { field: "period", headerName: translations("Period"), width: 100 },
    { field: "interval", headerName: translations("Interval"), width: 100 },
    {
      field: "status",
      headerName: translations("Status"),
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
    {
      field: "description",
      headerName: translations("Description"),
      width: 150,
    },
    {
      field: "actions",
      type: "actions",
      headerName: translations("Actions"),
      width: 100,
      cellClassName: "actions",
      getActions: ({ id, row }) => {
        return [
          <GridActionsCellItem
            icon={<IconTrash />}
            label={translations("Delete")}
            disabled={[
              PaymentPlanStatus.ACTIVE,
              PaymentPlanStatus.LIVE,
            ].includes(row.status)}
            onClick={() => {
              setSelectedPlanId(id as string);
              openDeleteModal();
            }}
            color="inherit"
            key={id + "delete-action"}
          />,
        ];
      },
    },
  ];

  const { data: plans, isLoading, isError } = usePaymentsPlans();
  if (isError) return <div>{translations("error occured")}</div>;
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
            <Text>{translations("List of plans from Razorpay DB")}</Text>
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
          showToolbar
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
        confirmLabel={translations("Delete")}
        headerTitle={translations("Delete RazorPay Plan")}
        onConfirm={() => {
          showLoadingToast(
            translations("Hold on..Plan is getting deleted"),
            "plan",
            true,
            translations("Deleting Plan"),
          );
          handleDeleteClick();
        }}
        headerLabel={translations("Are you sure to delete this plan?")}
        closeLabel={translations("cancel")}
      />
    </Stack>
  );
};

export default RazorpayPlans;
