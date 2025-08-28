"use client";

import {
  Box,
  Card,
  Combobox,
  Group,
  Input,
  InputBase,
  MultiSelectProps,
  SelectProps,
  Skeleton,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import {
  IconAward,
  IconMessage,
  IconShoppingCart,
  IconUserCircle,
  IconUserFilled,
  IconUserPlus,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LoyaltyActionType } from "@/types/enums";
import { LCustomerStats } from "@/app/dashboard/loyalty/customer/[customerId]/page";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";

import {
  ContainedMultiSelect,
  ContainedSelection,
} from "../input/ContainedInput/ContainedInput";
import PaperLayout from "../styled/Layouts/PaperLayout";
import classes from "./Loyalty.module.css";

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

export enum RewardTypes {
  FixedAmountDiscount = "Fixed Amount Discount",
  VariableDiscount = "Variable Discount",
  PercentageOff = "Percentage Off",
  FreeProduct = "Free Product",
  GiftCard = "Gift Card",
}

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

export enum ActionRewadTypes {
  Point = "Point",
  Reward = "Reward",
}

export const LoyaltyActionSelect = ({
  onChange,
  value,
  disabled,
  isReferralAvailable = true,
  w = "auto",
}) => {
  const translations = useTranslations();

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  function getActionIcon(type, color?) {
    switch (type) {
      case LoyaltyActionType.ReferralPurchase:
        return (
          <Box style={{ position: "relative", display: "inline-block" }}>
            <IconShoppingCart
              size={"1.2rem"}
              color={color ?? "var(--mantine-color-gray-7)"}
            />
            <IconUserFilled
              size={"0.7rem"}
              color="white"
              style={{
                backgroundColor: color ?? "var(--mantine-color-gray-7)",
              }}
              className={classes["icon-user"]}
            />
          </Box>
        );
      case LoyaltyActionType.DirectPurchase:
        return (
          <IconShoppingCart
            size={"1.2rem"}
            color={color ?? "var(--mantine-color-gray-7)"}
          />
        );
      case LoyaltyActionType.CustomerRegistration:
        return (
          <IconUserPlus
            size={"1.2rem"}
            color={color ?? "var(--mantine-color-gray-7)"}
          />
        );
      case LoyaltyActionType.FeedBack:
        return (
          <IconMessage
            size={"1.2rem"}
            color={color ?? "var(--mantine-color-gray-7)"}
          />
        );
    }
  }
  const options = Object.values(LoyaltyActionType)
    .filter((type) => (!isReferralAvailable ? !isLReferralAction(type) : true))
    .map((type) => (
      <Combobox.Option value={type} key={type}>
        <Group>
          {getActionIcon(type)}
          <Text size={"sm"}>{type}</Text>
        </Group>
      </Combobox.Option>
    ));
  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron c={"var(--tertiary-color)"} />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          radius={"md"}
          leftSection={getActionIcon(value, "var(--tertiary-color)")}
          classNames={{ input: classes["input"] }}
          disabled={disabled}
          label={translations("Select Action")}
          w={w}
        >
          {value || (
            <Input.Placeholder>
              {translations("Select action")}
            </Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export const CustomerStatsCard = ({
  stats,
  onClick,
  isSelected,
  hoveractive = false,
}) => {
  return (
    <PaperLayout
      onClick={onClick}
      style={{
        cursor: hoveractive ? "pointer" : undefined,
        border: isSelected ? "5px solid var(--light-blue-5)" : undefined,
      }}
      hoveractive={hoveractive}
      p="xs"
    >
      <Stack gap={2}>
        <Group justify="space-between">
          <Text fw={500}>{stats?.name}</Text>
          {stats?.icon}
        </Group>
        <Text fw={800} size="xl" c={"var(--tertiary-color)"}>
          {stats?.name === LCustomerStats.TotalSpent ? "$" : ""}
          {stats?.count}
        </Text>
      </Stack>
    </PaperLayout>
  );
};

export function getActionColor(type) {
  switch (type) {
    case LoyaltyActionType.ReferralPurchase:
      return "var(--shade-of-blue-18)";
    case LoyaltyActionType.DirectPurchase:
      return "var(--pink)";
    case LoyaltyActionType.CustomerRegistration:
      return "var(--shade-of-blue-17)";
  }
}
