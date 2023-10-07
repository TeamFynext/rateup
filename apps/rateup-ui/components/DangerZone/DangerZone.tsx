import { Divider, Paper, Stack, Text, Title } from "@mantine/core";
import React from "react";
import { RateupButtonSecondary } from "../Button/RateupButtons";

export default function DangerZone({ title, message, buttonText, onClick }) {
  return (
    <>
      <Title order={3}>Danger zone</Title>
      <Text>Irreversible and destructive actions</Text>
      <Paper shadow={"sm"} p="lg">
        <Stack align={"flex-start"} gap={"sm"}>
          <Title order={4}>{title}</Title>
          <Divider w="100%" />
          <Text>{message}</Text>
          <RateupButtonSecondary
            title={buttonText}
            color="red"
            fullWidth={false}
            onClick={onClick}
          />
        </Stack>
      </Paper>
    </>
  );
}
