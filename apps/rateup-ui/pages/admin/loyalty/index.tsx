import React, { useState } from "react";

import {
  Group,
  Radio,
  RadioGroup,
  SelectProps,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import { useGetLoyaltyActions } from "@/backend/loyalty/actions/actions.query";
import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import { useLCAction, useLCRedeem } from "@/backend/loyalty/loyalty.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import LoyaltySettings from "./LoyaltySettings";
import RegisterPageShare from "./RegisterPageShare";

const index = () => {
  return (
    <Stack>
      <PaperLayout>
        <RegisterPageShare />
      </PaperLayout>
      <SimpleGrid cols={2}>
        <PaperLayout>
          <LoyaltySettings />
        </PaperLayout>
        <PaperLayout>
          <LCACtionRedeemButtons />
        </PaperLayout>
      </SimpleGrid>
    </Stack>
  );
};

export default index;

//for demo
const LCACtionRedeemButtons = () => {
  const { data: customers, isPending: isLCP } = useLoyaltyCustomers();
  const { data: rewards, isPending: isLRP } = useGetLoyaltyRewards();
  const { data: actions, isPending: isLAP } = useGetLoyaltyActions();
  const [type, setType] = useState("action");

  const lcActionMut = useLCAction();

  const lcRedeemMut = useLCRedeem();

  const form = useForm({
    initialValues: {
      customerId: "",
      rewardId: "",
      actionId: "",
    },
  });

  const customerList = customers
    ? customers?.map((c) => ({
        label: c.customerInfo.phone,
        value: c.id,
      }))
    : [];
  const rewardList = rewards
    ? rewards?.map((r) => ({
        label: r.name,
        value: r.id,
      }))
    : [];
  const actionList = actions
    ? actions?.map((a) => ({
        label: a.name,
        value: a.id,
      }))
    : [];

  const LCSelector = (props: SelectProps) => {
    return <ContainedSelection data={customerList} {...props} />;
  };

  const LRSelector = (props: SelectProps) => {
    return <ContainedSelection data={rewardList} {...props} />;
  };

  const LASelector = (props: SelectProps) => {
    return <ContainedSelection data={actionList} {...props} />;
  };

  const handleCall = () => {
    const { customerId, actionId, rewardId } = form.values;
    if (type === "action") {
      lcActionMut.mutate(
        { customerId, actionId },
        {
          onSettled: () => {
            form.reset();
          },
        },
      );
      return;
    }
    lcRedeemMut.mutate(
      { customerId, rewardId },
      {
        onSettled: () => {
          form.reset();
        },
      },
    );
  };
  return (
    <Group>
      <Stack>
        <RadioGroup value={type} onChange={setType}>
          <Group>
            <Radio label={"On Customer Action"} value={"action"} />
            <Radio label={"On Customer redeem"} value="redee" />
          </Group>
        </RadioGroup>
        <LCSelector
          label={"Customer"}
          {...form.getInputProps("customerId")}
          placeholder="Select"
        />
        {type === "action" ? (
          <LASelector
            label={"Action"}
            {...form.getInputProps("actionId")}
            placeholder="Select"
          />
        ) : (
          <LRSelector
            label={"Reward"}
            {...form.getInputProps("rewardId")}
            placeholder="Select"
          />
        )}

        <RateupButtonBlue title="Call" onClick={handleCall} />
      </Stack>
    </Group>
  );
};
