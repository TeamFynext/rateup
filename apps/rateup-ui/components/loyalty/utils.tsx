import { Card, Group, SelectProps, Skeleton } from "@mantine/core";

import { LoyaltyActionType } from "@/types/enums";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";

import { ContainedSelection } from "../input/ContainedInput/ContainedInput";

export const LCSelector = (props: SelectProps) => {
  const { data: customers, isLoading } = useLoyaltyCustomers();
  const customerList = customers
    ? customers?.map((c) => ({
        label: c.customerInfo.phone,
        value: c.id,
      }))
    : [];
  if (isLoading) return <SelectSkeleton />;
  return (
    <ContainedSelection
      data={customerList}
      {...props}
      nothingFoundMessage="No customers found"
    />
  );
};

export const LRSelector = (props: SelectProps) => {
  const { data: rewards, isLoading } = useGetLoyaltyRewards();
  const rewardList = rewards
    ? rewards?.map((r) => ({
        label: r.name,
        value: r.id,
      }))
    : [];
  if (isLoading) return <SelectSkeleton />;
  return (
    <ContainedSelection
      data={rewardList}
      {...props}
      nothingFoundMessage="No rewards found"
    />
  );
};

export const LASelector = (props: SelectProps) => {
  const { data: actions, isLoading } = useGetLoyaltyActions();
  const actionList = actions
    ? actions
        .filter((a) => a.active)
        .map((a) => ({
          label: a.name,
          value: a.id,
        }))
    : [];
  if (isLoading) return <SelectSkeleton />;
  return (
    <ContainedSelection
      data={actionList}
      {...props}
      nothingFoundMessage="No actions found"
    />
  );
};

export const SelectSkeleton = () => {
  return (
    <Card h={46} w={240} radius={"md"} withBorder p={0}>
      <Group justify="space-between" w={"100%"} my={"auto"}>
        <Skeleton w={100} h={20} ml={"xs"} />
        <Skeleton w={20} h={20} mr={"xs"} />
      </Group>
    </Card>
  );
};

export const isLReferralAction = (actionType) =>
  actionType && [LoyaltyActionType.ReferralPurchase].includes(actionType);

export const isLPurchaseAction = (actionType) =>
  actionType &&
  [
    LoyaltyActionType.DirectPurchase,
    LoyaltyActionType.ReferralPurchase,
  ].includes(actionType);
