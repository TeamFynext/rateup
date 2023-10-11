import React from "react";
import { Stack } from "@mantine/core";
import GeneralSettings from "./GeneralSettings";
import { PasswordProtection } from "./PasswordSettings";
import OtherSettings from "./OtherSettings";
import Heading from "../../styled/Heading/Heading";

const SurveySettings = ({ surveyId, survey }) => {
  return (
    <Stack p={"sm"}>
      <Heading subtitle="General settings" label="Edit your survey info" />
      <GeneralSettings survey={survey} />
      <Heading
        subtitle="Password protection"
        label="Add password to the survey."
      />
      <PasswordProtection
        surveyId={surveyId}
        isProtected={survey?.isProtected}
      />
      <OtherSettings />
    </Stack>
  );
};

export default SurveySettings;
