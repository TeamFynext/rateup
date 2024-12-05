import React, { useEffect } from "react";

import { Group, Stack, Text } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import {
  useCreateLoyaltyTemplate,
  useGetLoyaltyTemplate,
  useUpdateLoyaltyTemplate,
} from "@/backend/loyalty/settings/settings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { TeamSelector } from "@/components/input/TeamSelector";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";

const LoyaltySettings = () => {
  return (
    <Stack p="xl">
      <Text>Loyalty Settings</Text>
      <Group>
        <LoyaltyWaTemplateConfig
          type={LoyaltyTemplateTypes.CustomerRegistration}
          label={"WhatsApp Template for Successfull Customer Registration"}
        />
      </Group>
    </Stack>
  );
};

export default LoyaltySettings;

export enum LoyaltyTemplateTypes {
  CustomerRegistration = "CustomerRegistration",
}

const LoyaltyWaTemplateConfig = ({ type, label }) => {
  const { data: config } = useGetLoyaltyTemplate(type);

  const templateMut = useCreateLoyaltyTemplate();

  const updateTempMut = useUpdateLoyaltyTemplate(type);

  const form = useForm({
    initialValues: {
      teamId: "",
      type: LoyaltyTemplateTypes.CustomerRegistration,
      waTemplateId: "",
    },
    validate: {
      teamId: isNotEmpty("Team required"),
      waTemplateId: isNotEmpty("Template required"),
    },
  });

  const hanldeTemplateConfig = () => {
    if (form.validate().hasErrors) return;
    if (config) {
      const { type, ...rest } = form.values;
      updateTempMut.mutate(rest);
      return;
    }
    templateMut.mutate(form.values);
  };

  useEffect(() => {
    if (config) {
      const { createdAt, id, orgId, ...rest } = config;
      form.setInitialValues({ ...rest });
      form.setValues({ ...rest });
    }
  }, [config]);

  return (
    <Stack>
      <TeamSelector {...form.getInputProps("teamId")} label="Team" />
      <WaTemplateSelector
        label={label}
        {...form.getInputProps("waTemplateId")}
        teamId={form.values.teamId}
      />
      <RateupButtonBlue
        title="Save"
        onClick={hanldeTemplateConfig}
        loading={templateMut.isPending || updateTempMut.isPending}
      />
    </Stack>
  );
};
