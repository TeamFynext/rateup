import React from "react";

import { Stack, Title } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconSend } from "@tabler/icons-react";
import { isValidPhoneNumber } from "react-phone-number-input";

import { TemplateType } from "@/types/enums";
import { useSendWaTemplateToUser } from "@/backend/whatsapp/whatsapp.query";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import FormModalLayout from "@/components/Modal/FormModalLayout";

const SendLoyaltyTemplate = ({ opened, close }) => {
  const form = useForm({
    initialValues: {
      phone: "",
      waTemplateId: "",
    },
    validate: {
      phone: (value) =>
        !value || !isValidPhoneNumber(value) ? "Invalid Phone number" : null,
      waTemplateId: isNotEmpty("Select WhatsApp Template"),
    },
  });
  const sendTemplate = useSendWaTemplateToUser(form.values.phone, "");

  function handleSendRegisterTemplate() {
    if (form.validate().hasErrors) return;
    sendTemplate.mutate({
      templateId: form.values.waTemplateId,
      parameterData: [],
      teamId: null,
    });
  }
  return (
    <FormModalLayout
      title=""
      centered
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      buttonTitle="Send"
      onSubmit={handleSendRegisterTemplate}
      submitButtonLeftIcon={<IconSend />}
      isLoading={sendTemplate.isPending}
    >
      <Title ta={"center"} mb={"xl"} order={4}>
        Send Loyalty Register Template
      </Title>
      <Stack>
        <PhoneInputWithCountry
          label="Phone Number"
          {...form.getInputProps("phone")}
        />
        <WaTemplateSelector
          templateType={TemplateType.LOYALTY}
          {...form.getInputProps("waTemplateId")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default SendLoyaltyTemplate;
