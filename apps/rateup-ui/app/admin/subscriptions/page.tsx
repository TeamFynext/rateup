"use client";

import { useState } from "react";

import { CloseButton, Flex, Group, Input, Skeleton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useRateupPaymentsPlans } from "@/backend/payment/payment.query";
import {
  useAllSubscriptions,
  useUpdateSubscriptionMutation,
} from "@/backend/subscription/subscription.query";
import styles from "@/components/adminPanel/admin.module.css";
import { FeatureBadge } from "@/components/adminPanel/Subscription/FeatureBadge";
import { SubscriptionEditorModal } from "@/components/adminPanel/Subscription/SubscriptionEditorModal";
import RefreshButton from "@/components/Button/RefreshButton";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";

export default function SubscriptionPage() {
  const {
    data: subscriptions,
    isLoading: isSubscriptionsLoading,
    isError: isSubscriptionsError,
  } = useAllSubscriptions();
  const translations = useTranslations();
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
        basePlanId: updatedField?.basePlanId,
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
    { field: "orgName", headerName: translations("OrgName"), width: 220 },
    {
      field: "plan",
      headerName: translations("Plan Name"),
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
      headerName: translations("Features"),
      minWidth: 300,
      flex: 1,
      renderCell: renderFeatures,
    },
    { field: "createdAt", headerName: translations("Created At"), width: 120 },
    { field: "renewedAt", headerName: translations("Renewed At"), width: 120 },
    { field: "expiresAt", headerName: translations("Expires At"), width: 120 },
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
        <Group>
          <h1>{translations("Subscriptions")}</h1>
          <RefreshButton queryKeys={["subscriptions"]} />
        </Group>
        <Input
          placeholder={translations("Search by OrgName or orgId")}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          rightSectionPointerEvents="all"
          mt="md"
          leftSection={<IconSearch size={16} />}
          rightSection={
            <CloseButton
              aria-label={translations("Clear input")}
              onClick={() => setSearchQuery("")}
              style={{ display: searchQuery ? undefined : "none" }}
            />
          }
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
            headerLabel={translations("Are you sure to update plan?")}
            onConfirm={handleUpdateSubscriptionPlan}
            confirmLabel={translations("Yes")}
            closeLabel={translations("Cancel")}
            headerTitle={translations("Update Plan")}
          />
        </>
      )}
    </div>
  );
}

export function renderFeatures(params: GridRenderCellParams<any, any>) {
  const subscription = params.value; //rateup plan in admin/rateup
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
