import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import { useReferralLoyaltyAction } from "@/backend/loyalty/actions/actions.query";

import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";

const ReferralAction = ({ opened, close }) => {
  const form = useForm({
    initialValues: {
      referralCode: "",
    },
    validate: {
      referralCode: isNotEmpty("Referral Code required"),
    },
  });
  const referActionMut = useReferralLoyaltyAction();
  const handleRefer = () => {
    if (form.validate().hasErrors) return;

    referActionMut.mutate(form.values, {
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
        <ContainedTextField
          label={"Referral Code"}
          {...form.getInputProps("referralCode")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default ReferralAction;
