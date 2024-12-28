import { useEffect } from "react";

import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import { TemplateType } from "@/types/enums";
import {
  ContainedDateInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
} from "../../../backend/loyalty/reward/reward.query";
import { RewardTypes } from "../utils";

export function CreateRewardModal({
  opened,
  close,
  reward,
  disableButton
}: {
  opened: boolean;
  close: () => void;
  reward?: any;
  disableButton?: boolean
}) {
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
        amount: 0
      }
    },
    validate: {
      name: isNotEmpty("Name cannot be empty"),
      points: (value) => (!value ? "Points required" : null),
      maxPerUser: (value) => (!value ? "Max Per User required" : null),
      description: isNotEmpty("description cannot be empty"),
      rewardType: isNotEmpty("Select Reward Type"),
      rewardValue: (value, values) => !value.value ? "Provide reward value" : 
      values.rewardType === RewardTypes.VariableDiscount && !value.amount ? "Provide amount" : null
    },
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    if (reward) {
      updateReward.mutate(form.values, {
        onSuccess: () => {
          form.reset();
          close();
        },
      });
      return;
    }
    createReward.mutate(form.values, {
      onSuccess: () => {
        form.reset();
        close();
      },
    });
  }

  useEffect(() => {
    if (reward) {
      form.setInitialValues({
        ...reward,
        rewardValue: reward.rewardValue ?? {
          value: "",
          amount: 0
        },
        expireAt: reward?.expireAt ? new Date(reward?.expireAt) : null,
      });
      form.setValues({
        ...reward,
        rewardValue: reward.rewardValue ?? {
          value: "",
          amount: 0
        },
        expireAt: reward?.expireAt ? new Date(reward?.expireAt) : null,
      });
    }
  }, [reward]);

  form.watch("rewardType", ({ touched }) => {
    if(touched) form.setFieldValue("rewardValue.value","")
  })

  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title={
        reward ? disableButton ? reward.name : translations["Update Reward"] : translations["Create Reward"]
      }
      centered
      buttonTitle={disableButton ? undefined: reward ? "Update" : "Create"}
      onSubmit={form.onSubmit(handleSubmit)}
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      size="lg"
      isLoading={createReward.isPending}
      includeCancelButton={!disableButton}
    >
      <LoyaltyRewardForm form={form} disabled={disableButton} />
    </FormModalLayout>
  );
}

export const LoyaltyRewardForm = ({ form, disabled }) => {
  const { translations } = useTranslations();
  return (
    <Stack>
      <ContainedTextField
        label={"Name"}
        {...form.getInputProps("name")}
        placeholder={translations["Enter Reward Name"]}
        readOnly={disabled}
      />
      <ContainedSelection
       data={Object.values(RewardTypes)} 
       {...form.getInputProps("rewardType")}
       label="Reward Type"
       placeholder="Choose Reward Type"
       readOnly={disabled}
       />
      <RewardValueInput form={form} readOnly={disabled}/>
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
      <ContainedTextArea
        label={"Description"}
        {...form.getInputProps("description")}
        autosize
        minRows={3}
        description={"Used in whatsapp message to describe reward"}
        readOnly={disabled}
      />
      <ContainedTextArea
        label={"Terms and Condition"}
        {...form.getInputProps("tnc")}
        autosize
        minRows={3}
        readOnly={disabled}
      />
      <WaTemplateSelector
        templateType={TemplateType.LOYALTY}
        label="WhatsApp Template(to send after reward redemption)"
        {...form.getInputProps("waTemplateId")}
        description="Dynamic variable {{1}} - customer name, {{2}} - current redeemed points"
        readOnly={disabled}
      />
    </Stack>
  );
};

const RewardValueInput = ({ form, readOnly }) => {
   switch(form.values.rewardType){
     case RewardTypes.FixedAmountDiscount:
       return <ContainedNumberInput label="Discount Amount" allowNegative={false} readOnly={readOnly} {...form.getInputProps("rewardValue.value")}/>
     case RewardTypes.VariableDiscount:
      return (
        <>
         <ContainedNumberInput label="Amount" {...form.getInputProps("rewardValue.amount")}  readOnly={readOnly}  allowNegative={false}/>
         <ContainedNumberInput label="Discout Amount"  readOnly={readOnly}  allowNegative={false} {...form.getInputProps("rewardValue.value")} />
        </>
      )
     case RewardTypes.FreeProduct:
      return <ContainedTextField label="Product Name"  readOnly={readOnly}  {...form.getInputProps("rewardValue.value")}/>
     case RewardTypes.PercentageOff:
      return <ContainedNumberInput label="Percentage (%)"  readOnly={readOnly}  max={100} allowNegative={false} {...form.getInputProps("rewardValue.value")}/>
     case RewardTypes.GiftCard:
      return <ContainedNumberInput label="Discount Amount"  readOnly={readOnly}  {...form.getInputProps("rewardValue.value")} />
   }
}
