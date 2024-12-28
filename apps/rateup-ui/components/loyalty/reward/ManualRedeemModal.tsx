import React, { useEffect, useState } from "react";

import { Group, Stack, Text } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import { useLoyaltyCustomers } from "@/backend/loyalty/customer/customer.query";
import { useRedeemReward } from "@/backend/loyalty/redeems/redeems.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import {
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import FormModalLayout from "@/components/Modal/FormModalLayout";

import { LoyaltyPointIcon } from "../Actions/LoyaltyActionCard";

const ManualRedeemModal = ({ opened, close }) => {
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const form = useForm({
    initialValues: {
      customerId: "",
      rewardId: "",
    },
    validate: {
      rewardId: isNotEmpty("Choose a reward"),
    },
  });

  const { data: customers } = useLoyaltyCustomers();
  const { data: rewards } = useGetLoyaltyRewards();

  const redeemReward = useRedeemReward();

  const phones = customers ? customers.map((c) => c.customerInfo.phone) : [];

  const rewardData = rewards
    ? rewards?.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.points} Points)`,
      }))
    : [];

  useEffect(() => {
    if (customers && phone) {
      setError("");
      const cust = customers.find((c) => c.customerInfo.phone === phone);
      setCustomer(cust);
      form.setFieldValue("customerId", cust?.id);
    }
  }, [phone, customers]);

  function handleRedeem() {
    if (!phone.trim().length || !customer) {
      setError("Customer not found");
      return;
    }
    if (form.validate().hasErrors) return;
    redeemReward.mutate(form.values, {
      onSuccess: () => {
        setCustomer(null);
        setPhone("");
        form.reset();
        close();
      },
      onError: () => {
        setCustomer(null);
        setPhone("");
        form.reset();
        close();
      },
    });
  }

  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        setCustomer(null);
        setPhone("");
        close();
      }}
      title="Manual Redeeem"
      centered
    >
      <Stack>
        <ContainedSelection
          data={phones}
          searchable={!!phones?.length}
          value={phone}
          onChange={setPhone}
          label={"Phone"}
          error={error}
          withAsterisk
          nothingFoundMessage={"No customers found"}
        />
        <ContainedTextField
          value={customer?.customerInfo.name}
          readOnly
          label={"Name"}
        />
        {customer && (
          <Group gap={"xs"} mt={0}>
            <LoyaltyPointIcon />
            <Text size="sm">
              {" "}
              {customer?.customerInfo.name} has {customer.balancePoints} Points
            </Text>
          </Group>
        )}
        <ContainedSelection
          data={rewardData}
          disabled={!customer}
          label={"Rewards"}
          {...form.getInputProps("rewardId")}
          placeholder="Select a reward"
        />
        <RateupButtonBlue title="Redeem" onClick={handleRedeem} />
      </Stack>
    </FormModalLayout>
  );
};

export default ManualRedeemModal;
