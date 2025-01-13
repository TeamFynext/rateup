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
  Text,
  useCombobox,
} from "@mantine/core";
import {
  IconAward,
  IconShoppingCart,
  IconUserFilled,
  IconUserPlus,
} from "@tabler/icons-react";

import { LoyaltyActionType } from "@/types/enums";
import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";

import {
  ContainedMultiSelect,
  ContainedSelection,
} from "../input/ContainedInput/ContainedInput";
import classes from "./Loyalty.module.css";

export const LCSelector = (props: SelectProps) => {
  const { data: customers, isLoading } = useLoyaltyCustomers({
    pagination: false,
  });
  const customerList = customers
    ? customers?.map((c) => ({
        label: c.phone,
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
        nothingFoundMessage="No actions found"
        placeholder={multiSelectProps.placeholder || "Select"}
      />
    );
  return (
    <ContainedSelection
      data={actionList}
      {...props}
      nothingFoundMessage="No actions found"
      placeholder={props.placeholder || "Select"}
    />
  );
};

export const LReferralSelector = ({
  multiSelect = false,
  multiSelectProps,
  ...props
}: LAProps) => {
  const { data: actions, isLoading } = useGetLoyaltyActions();
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
        nothingFoundMessage="No actions found"
        placeholder={multiSelectProps.placeholder || "Select"}
      />
    );
  return (
    <ContainedSelection
      data={actionList}
      {...props}
      nothingFoundMessage="No actions found"
      placeholder={props.placeholder || "Select"}
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
          label={"Select Action"}
          w={w}
        >
          {value || <Input.Placeholder>Select action</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
