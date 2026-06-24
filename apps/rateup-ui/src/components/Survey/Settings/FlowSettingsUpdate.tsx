import { Box, Group, Stack, Switch } from "@mantine/core";
import { useForm } from "@mantine/form";
import React from "react";
import { useTranslation } from "react-i18next";

import { useUpdateFlowMetaDataMutation } from "@/backend/whatsapp/flow/flow.query";

import { RateupButtonPrimary } from "../../Button/RateupButtons.tsx";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput.tsx";
import PaperLayout from "../../styled/Layouts/PaperLayout.tsx";

import styles from "./SurveySettings.module.css";

const FlowSettingsUpdate = ({
  name,
  dbFlowId,
  anonymous,
}: {
  name: string;
  dbFlowId: string;
  anonymous: boolean;
}) => {
  const form = useForm({
    initialValues: {
      name: name ?? "",
      anonymous: anonymous ?? false,
    },
  });
  const updateFlowMetaDataMutation = useUpdateFlowMetaDataMutation();
  const handleFlowMetaData = () => {
    updateFlowMetaDataMutation.mutate({
      data: form.getValues(),
      dbFlowId,
    });
  };
  const { t: translations } = useTranslation();
  return (
    <PaperLayout>
      <Stack align="center">
        <ContainedTextField
          className={styles["form-input"]}
          withAsterisk
          label={translations("Flow Name")}
          placeholder={translations("Enter Flow name")}
          required
          w={"100%"}
          key={form.key("name")}
          {...form.getInputProps("name")}
        />
        <Group w={"100%"}>
          <Switch
            className={`switch ${(anonymous ?? false) ? "on" : "off"}`}
            size="md"
            key={form.key("anonymous")}
            {...form.getInputProps("anonymous", { type: "checkbox" })}
          />
          <Box className={"switch-heading-and-desc-container"}>
            <h3>{translations("Anonymous")}</h3>
            <p>
              {form.getValues().anonymous
                ? translations("Anonymous Flow is enabled")
                : translations("Anonymous Flow is disabled")}
            </p>
          </Box>
        </Group>
        <RateupButtonPrimary
          title={translations("Save Changes")}
          onClick={handleFlowMetaData}
          loading={updateFlowMetaDataMutation?.isPending}
        />
      </Stack>
    </PaperLayout>
  );
};

export default FlowSettingsUpdate;
