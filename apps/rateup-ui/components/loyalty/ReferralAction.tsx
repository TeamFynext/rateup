import { Checkbox, Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import { useReferralLoyaltyAction } from "@/backend/loyalty/actions/actions.query";

import {
  ContainedNumberInput,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "../input/PhoneInputWithCountry";
import FormModalLayout from "../Modal/FormModalLayout";
import { LASelector } from "./utils";

const ReferralAction = ({ opened, close }) => {
  const form = useForm({
    initialValues: {
      referralCode: "",
      refereePhone: "",
      refereeName: "",
      amount: 0,
      actionIds: [],
      issuePurchasePoints:false
    },
    validate: {
      referralCode: isNotEmpty("Referral Code required"),
      refereePhone: isNotEmpty("Phone number required"),
      actionIds: (value, { issuePurchasePoints }) => issuePurchasePoints && !value.length ? "Select actions" : null
    },
  });
  const referActionMut = useReferralLoyaltyAction();
  const handleRefer = () => {
    if (form.validate().hasErrors) return;
    const { referralCode, ...rest } = form.values
    referActionMut.mutate({ referralCode, data: rest }, {
      onSettled: () => {
        form.reset();
        close();
      },
    });
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title=""
      onSubmit={handleRefer}
      buttonTitle="Refer"
      includeCancelButton
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      centered
      isLoading={referActionMut.isPending}
    >
      <Stack>
        <PhoneInputWithCountry
          label={"Phone Number"}
          {...form.getInputProps("refereePhone")}
        />
        <ContainedTextField
          label={"Name"}
          {...form.getInputProps("refereeName")}
        />
        <ContainedTextField
          label={"Referral Code"}
          {...form.getInputProps("referralCode")}
        />
        <ContainedNumberInput
          label={"Amount (optional)"}
          {...form.getInputProps("amount")}
        />
        <Checkbox  {...form.getInputProps("issuePurchasePoints")} label="Issue Direct Purchase Points" />
        <LASelector multiSelect={true} multiSelectProps={{
          label:"Select Actions",
          display: form.values.issuePurchasePoints ? "block" : "none",
           ...form.getInputProps("actionIds"),
           mb:"sm"
          }}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default ReferralAction;
