import React, { useState } from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import styles from "./SurveySettings.module.css";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { Box, Group, Stack, Switch } from "@mantine/core";
import { useUpdateFlowMetaDataMutation } from "../../../backend/whatsapp/flow/flow.query";
import { useForm } from "@mantine/form";

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
  return (
    <PaperLayout>
      <Stack align="center">
        <ContainedTextField
          className={styles["form-input"]}
          withAsterisk
          label={"Flow Name"}
          placeholder="Enter Flow name"
          required
          w={"100%"}
          key={form.key("name")}
          {...form.getInputProps("name")}
        />
        <Group w={"100%"}>
          <Switch
            className={`switch ${anonymous ?? false ? "on" : "off"}`}
            size="md"
            key={form.key("anonymous")}
            {...form.getInputProps("anonymous", { type: "checkbox" })}
          />
          <Box className={"switch-heading-and-desc-container"}>
            <h3>Anonymous</h3>
            <p>
              {form.getValues().anonymous
                ? "Anonymous Flow is enabled"
                : "Anonymous Flow is disabled"}
            </p>
          </Box>
        </Group>
        <RateupButtonPrimary
          title="Save Changes"
          onClick={handleFlowMetaData}
          loading={updateFlowMetaDataMutation?.isPending}
        />
      </Stack>
    </PaperLayout>
  );
};

export default FlowSettingsUpdate;
