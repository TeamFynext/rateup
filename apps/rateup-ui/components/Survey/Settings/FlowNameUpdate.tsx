import React, { useState } from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import styles from "./SurveySettings.module.css";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { Stack } from "@mantine/core";
import { useUpdateFlowMetaDataMutation } from "../../../backend/whatsapp/flow/flow.query";

const FlowNameUpdate = ({
  name,
  dbFlowId,
}: {
  name: string;
  dbFlowId: string;
}) => {
  const [flowName, setFlowName] = useState(name ?? "");
  const updateFlowMetaDataMutation = useUpdateFlowMetaDataMutation();
  const handleFlowMetaData = () => {
    updateFlowMetaDataMutation.mutate({
      data: {
        name: flowName,
      },
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
          onChange={(e) => setFlowName(e?.target?.value)}
          value={flowName}
          w={"100%"}
        />
        <RateupButtonPrimary
          title="Save Changes"
          onClick={handleFlowMetaData}
          loading={updateFlowMetaDataMutation?.isPending}
        />
      </Stack>
    </PaperLayout>
  );
};

export default FlowNameUpdate;
