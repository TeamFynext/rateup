import { Stack } from "@mantine/core";
import { useForm } from "@mantine/form";

import { useLCAction } from "@/backend/loyalty/customer/customer.query";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import FormModalLayout from "@/components/Modal/FormModalLayout";

import { LASelector, LCSelector } from "../utils";

const LoyaltyManualCustomerActionModal = ({ opened, close }) => {
  const lcActionMut = useLCAction();

  const form = useForm({
    initialValues: {
      phone: "",
      actionId: "",
      amount: 0,
    },
  });

  const handleCall = () => {
    lcActionMut.mutate(form.values, {
      onSettled: () => {
        form.reset();
        close();
      },
    });
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={"Points Issuance"}
      centered
      includeCancelButton
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      buttonTitle="Issue"
      onSubmit={handleCall}
      isLoading={lcActionMut.isPending}
    >
      <Stack>
        <LCSelector
          label={"Customer"}
          {...form.getInputProps("customerId")}
          placeholder="Select"
          searchable
        />
        <PhoneInputWithCountry
          label={"Phone number"}
          {...form.getInputProps("phone")}
        />
        <LASelector
          label={"Action"}
          {...form.getInputProps("actionId")}
          placeholder="Select"
        />
        <ContainedNumberInput
          label={"Amount (optional) "}
          {...form.getInputProps("amount")}
          placeholder="Enter amount"
        />
      </Stack>
    </FormModalLayout>
  );
};

export default LoyaltyManualCustomerActionModal;
