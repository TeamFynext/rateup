import {
  Paper,
  Text,
  Stack,
  Button,
  CopyButton,
  Group,
  TextInput,
} from "@mantine/core";
import { useRouter } from "next/router";
import React from "react";

const ShareSurvey = () => {
  const { surveyId } = useRouter().query;
  return (
    <Stack>
      <Paper p="md">
        <Text>Share Survey</Text>
        <CopyLinkComponent
          value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`}
        />
      </Paper>
    </Stack>
  );
};

const CopyLinkComponent = ({ value }) => {
  return (
    <Group spacing={"0px"}>
      <TextInput
        sx={{ flexGrow: 1, maxWidth: "600px" }}
        readOnly
        value={value}
      ></TextInput>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button color={copied ? "teal" : "blue"} onClick={copy}>
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
};

export default ShareSurvey;
