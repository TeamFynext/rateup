import { useEffect } from "react";
import router from "next/router";

import { Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import { TemplateType } from "@/types/enums";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedDateInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
} from "../../../backend/loyalty/reward/reward.query";
import { RewardTypes } from "../utils";

const LoyaltyRewardForm = ({
  disabled,
  reward,
  existingRewardIds,
  title,
}: {
  disabled?: boolean;
  reward: any;
  existingRewardIds?: string[];
  title: string;
}) => {
  const { translations } = useTranslations();

  const createReward = useCreateLoyaltyRewardMutation();
  const updateReward = useUpdateLoyaltyRewardMutation(reward?.id);

  const form = useForm({
    initialValues: {
      name: "",
      points: 0,
      description: "",
      maxPerUser: 1,
      tnc: "",
      waTemplateId: "",
      expireAt: null,
      rewardType: "",
      rewardValue: {
        value: "",
        amount: 0,
      },
      reward_id: "",
    },
    validate: {
      name: isNotEmpty("Name cannot be empty"),
      points: (value) => (!value ? "Points required" : null),
      maxPerUser: (value) => (!value ? "Max Per User required" : null),
      description: isNotEmpty("description cannot be empty"),
      rewardType: isNotEmpty("Select Reward Type"),
      rewardValue: (value, values) =>
        !value.value
          ? "Provide reward value"
          : values.rewardType === RewardTypes.VariableDiscount && !value.amount
            ? "Provide amount"
            : null,
      reward_id: (value) =>
        !/^[A-Za-z0-9_]+$/.test(value)
          ? "Reward Id can only have alphanumerics and underscore"
          : !reward && existingRewardIds.includes(value)
            ? "Reward Id already taken"
            : null,
    },
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    if (reward) {
      updateReward.mutate(form.values, {
        onSuccess: () => {
          form.reset();
          // close();
          router.push("/dashboard/loyalty/rewards");
        },
      });
      return;
    }
    createReward.mutate(form.values, {
      onSuccess: () => {
        form.reset();
        // close();
        router.push("/dashboard/loyalty/rewards");
      },
    });
  }

  useEffect(() => {
    if (reward) {
      form.setInitialValues({
        ...reward,
        rewardValue: reward.rewardValue ?? {
          value: "",
          amount: 0,
        },
        expireAt: reward?.expireAt ? new Date(reward?.expireAt) : null,
      });
      form.setValues({
        ...reward,
        rewardValue: reward.rewardValue ?? {
          value: "",
          amount: 0,
        },
        expireAt: reward?.expireAt ? new Date(reward?.expireAt) : null,
      });
    }
  }, [reward]);

  form.watch("rewardType", ({ touched }) => {
    if (touched) form.setFieldValue("rewardValue.value", "");
  });

  useEffect(() => {
    if (
      !reward &&
      form.values.reward_id &&
      existingRewardIds.includes(form.values.reward_id)
    ) {
      form.setFieldError("reward_id", "Reward Id already taken");
    }
  }, [form.values.reward_id]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title>{title}</Title>
        <Group>
          <RateupButtonSecondary
            title={"Cancel"}
            onClick={() => {
              form.reset();
              router.push("/dashboard/loyalty/rewards");
            }}
          />
          <RateupButtonPrimary
            title="Save"
            onClick={handleSubmit}
            loading={createReward.isPending || updateReward.isPending}
          />
        </Group>
      </Group>
      <PaperLayout>
        <SimpleGrid cols={2}>
          <ContainedTextField
            label={"Name"}
            {...form.getInputProps("name")}
            placeholder={translations["Enter Reward Name"]}
            readOnly={disabled}
          />
          <ContainedTextField
            label={"Reward Id"}
            {...form.getInputProps("reward_id")}
            placeholder={"Enter reward id"}
            readOnly={disabled}
            disabled={reward && reward.reward_id?.length}
          />
          <ContainedTextArea
            label={"Description"}
            {...form.getInputProps("description")}
            autosize
            minRows={3}
            readOnly={disabled}
          />
          <ContainedTextArea
            label={"Terms and Condition"}
            {...form.getInputProps("tnc")}
            autosize
            minRows={3}
            readOnly={disabled}
          />
          <ContainedSelection
            data={Object.values(RewardTypes)}
            {...form.getInputProps("rewardType")}
            label="Reward Type"
            placeholder="Choose Reward Type"
            readOnly={disabled}
          />
          <RewardValueInput form={form} readOnly={disabled} />
          <ContainedNumberInput
            label={"Points"}
            {...form.getInputProps("points")}
            allowDecimal={false}
            allowNegative={false}
            readOnly={disabled}
          />
          <ContainedNumberInput
            label={"Max Per User"}
            {...form.getInputProps("maxPerUser")}
            allowDecimal={false}
            allowNegative={false}
            readOnly={disabled}
          />
          <ContainedDateInput
            label={"Expiry Date"}
            {...form.getInputProps("expireAt")}
            readOnly={disabled}
          />
          <WaTemplateSelector
            templateType={TemplateType.LOYALTY}
            label="WhatsApp Template(to send after reward redemption)"
            {...form.getInputProps("waTemplateId")}
            description="Dynamic variable {{1}} - customer name, {{2}} - current redeemed points"
            readOnly={disabled}
          />
        </SimpleGrid>
      </PaperLayout>
    </Stack>
  );
};

export default LoyaltyRewardForm;

const RewardValueInput = ({ form, readOnly }) => {
  switch (form.values.rewardType) {
    case RewardTypes.FixedAmountDiscount:
      return (
        <ContainedNumberInput
          label="Discount Amount"
          allowNegative={false}
          readOnly={readOnly}
          {...form.getInputProps("rewardValue.value")}
        />
      );
    case RewardTypes.VariableDiscount:
      return (
        <>
          <ContainedNumberInput
            label="Amount"
            {...form.getInputProps("rewardValue.amount")}
            readOnly={readOnly}
            allowNegative={false}
          />
          <ContainedNumberInput
            label="Discout Amount"
            readOnly={readOnly}
            allowNegative={false}
            {...form.getInputProps("rewardValue.value")}
          />
        </>
      );
    case RewardTypes.FreeProduct:
      return (
        <ContainedTextField
          label="Product Name"
          readOnly={readOnly}
          {...form.getInputProps("rewardValue.value")}
        />
      );
    case RewardTypes.PercentageOff:
      return (
        <ContainedNumberInput
          label="Percentage (%)"
          readOnly={readOnly}
          max={100}
          allowNegative={false}
          {...form.getInputProps("rewardValue.value")}
        />
      );
    case RewardTypes.GiftCard:
      return (
        <ContainedNumberInput
          label="Discount Amount"
          readOnly={readOnly}
          {...form.getInputProps("rewardValue.value")}
        />
      );
  }
};
