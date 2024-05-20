import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  useAllSubscriptions,
  useUpdateSubscriptionMutation,
} from "../../backend/subscription/subscription.query";
import dayjs from "dayjs";
import { Flex, Group, Input, Skeleton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { SubscriptionEditorModal } from "../../components/adminPanel/Subscription/SubscriptionEditorModal";
import { FeatureBadge } from "../../components/adminPanel/Subscription/FeatureBadge";
import { SubscriptionFeaturePathName } from "../../types/enums";
import styles from "../../components/adminPanel/admin.module.css";
import { useRateupPaymentsPlans } from "../../backend/payment/payment.query";
import { useState } from "react";
import ConfirmationModal from "../../components/Modal/ConfirmationModal";

export default function () {
  const {
    data: subscriptions,
    isLoading: isSubscriptionsLoading,
    isError: isSubscriptionsError,
  } = useAllSubscriptions();

  const { data: rateupPlans } = useRateupPaymentsPlans();
  const updateSubscriptionMutation = useUpdateSubscriptionMutation();
  const plansData = rateupPlans?.map((plan) => ({
    value: plan.id,
    label: plan.name,
  }));

  const [updatedField, setUpdatedField] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openedDialog, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);
  const handleUpdateSubscriptionPlan = () => {
    updateSubscriptionMutation.mutate({
      orgId: updatedField?.orgId,
      updatedData: {
        basePlanId: updatedField.basePlanId,
        renewedAt: new Date(),
      },
    });
  };
  if (isSubscriptionsError) return <div>error occured</div>;

  const columns: GridColDef[] = [
    {
      field: "orgId",
      headerName: "OrgId",
      width: 120,
      cellClassName: styles.idCell,
    },
    { field: "orgName", headerName: "OrgName", width: 220 },
    {
      field: "plan",
      headerName: "Plan Name",
      width: 220,
      editable: true,
      type: "singleSelect",
      preProcessEditCellProps(params) {
        if (params.hasChanged) {
          setUpdatedField({ orgId: params.id, basePlanId: params.props.value });
          openDialog();
        }
        return { ...params.props };
      },
      valueOptions: plansData,
    },
    {
      field: "features",
      headerName: "Features",
      minWidth: 300,
      flex: 1,
      renderCell: renderFeatures,
    },
    { field: "createdAt", headerName: "Created At", width: 120 },
    { field: "renewedAt", headerName: "Renewed At", width: 120 },
    { field: "expiresAt", headerName: "Expires At", width: 120 },
  ];

  const rows = subscriptions?.map((subscription) => {
    return {
      id: subscription.orgId,
      orgId: (subscription as any).org.id,
      orgName: (subscription as any).org.name,
      plan: subscription?.basePlan?.id,
      features: subscription,
      createdAt: dayjs(subscription.createdAt).format("YYYY/MM/DD"),
      renewedAt: subscription.renewedAt
        ? dayjs(subscription.renewedAt).format("YYYY/MM/DD")
        : "",
      expiresAt: dayjs(subscription.expiresAt).format("YYYY/MM/DD"),
    };
  });

  const filteredRows = searchQuery
    ? rows.filter(
        (row) =>
          row.orgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.orgId
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : rows;
  return (
    <div>
      <Flex justify="space-between">
        <h1>Subscriptions</h1>
        <Input
          placeholder="🔍  Search by OrgName or orgId"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "300px" }}
        />
      </Flex>
      {isSubscriptionsLoading ? (
        <Skeleton height={500} />
      ) : (
        <>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowHeight={() => "auto"}
          />
          <ConfirmationModal
            opened={openedDialog}
            onClose={closeDialog}
            headerLabel={`Are you sure to update plan?`}
            onConfirm={handleUpdateSubscriptionPlan}
            confirmLabel="Yes"
            closeLabel="Cancel"
            headerTitle="Update Plan"
          />
        </>
      )}
    </div>
  );
}

export function renderFeatures(params: GridRenderCellParams<any, any>) {
  const subscription = params.value;
  const features = subscription.features;
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Group
      py={"md"}
      onClick={open}
      style={{
        cursor: "pointer",
      }}
    >
      {features &&
        Object.keys(features)
          .filter((feature) => features[feature].active)
          .map((feature: SubscriptionFeaturePathName) => {
            return <FeatureBadge key={feature} featurePathName={feature} />;
          })}
      <SubscriptionEditorModal
        opened={opened}
        onClose={close}
        subscription={subscription}
      />
    </Group>
  );
}
