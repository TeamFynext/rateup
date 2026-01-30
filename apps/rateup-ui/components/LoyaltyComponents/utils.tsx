"use client";

import {
  Card,
  Group,
  MultiSelectProps,
  SelectProps,
  Skeleton,
  Text,
} from "@mantine/core";
import { IconAward } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LoyaltyActionType } from "@/types/enums";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";

import {
  ContainedMultiSelect,
  ContainedSelection,
} from "../input/ContainedInput/ContainedInput";

export const LRSelector = (props: SelectProps) => {
  const translations = useTranslations();
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
      nothingFoundMessage={translations("No Rewards found")}
    />
  );
};

interface LAProps extends SelectProps {
  multiSelect?: boolean;
  multiSelectProps?: MultiSelectProps;
}

export const LASelector = ({
  multiSelect = false,
  multiSelectProps,
  ...props
}: LAProps) => {
  const { data: actions, isLoading } = useGetLoyaltyActions();
  const translations = useTranslations();
  const actionList = actions
    ? actions
        .filter(
          (a) => a.active && (multiSelect ? !isLReferralAction(a.type) : true),
        )
        .map((a) => ({
          label: `${a.name} (${a.type})`,
          value: a.id,
        }))
    : [];
  if (isLoading) return <SelectSkeleton />;
  if (multiSelect)
    return (
      <ContainedMultiSelect
        data={actionList}
        {...multiSelectProps}
        nothingFoundMessage={translations("No action found")}
        placeholder={multiSelectProps.placeholder || translations("Select")}
      />
    );
  return (
    <ContainedSelection
      data={actionList}
      {...props}
      nothingFoundMessage={translations("No action found")}
      placeholder={props.placeholder || translations("Select")}
    />
  );
};

export const LReferralSelector = ({
  multiSelect = false,
  multiSelectProps,
  ...props
}: LAProps) => {
  const { data: actions, isLoading } = useGetLoyaltyActions();
  const translations = useTranslations();
  const actionList = actions
    ? actions
        .filter((a) => a.active && isLReferralAction(a.type))
        .map((a) => ({
          label: `${a.name} (${a.type})`,
          value: a.id,
        }))
    : [];
  if (isLoading) return <SelectSkeleton />;
  if (multiSelect)
    return (
      <ContainedMultiSelect
        data={actionList}
        {...multiSelectProps}
        nothingFoundMessage={translations("No action found")}
        placeholder={multiSelectProps.placeholder || translations("Select")}
      />
    );
  return (
    <ContainedSelection
      data={actionList}
      {...props}
      nothingFoundMessage={translations("No action found")}
      placeholder={props.placeholder || translations("Select")}
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

export const LoyaltyReward = ({ rewardName }) => {
  return (
    <Group gap={2}>
      <IconAward size={"1.5rem"} color="#F9861E" />
      <Text c={"#F9861E"} fw={"bold"} fz={14}>
        {rewardName}
      </Text>
    </Group>
  );
};
