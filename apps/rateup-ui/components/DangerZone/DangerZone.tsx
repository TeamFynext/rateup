import { Divider, Stack, Text, Title } from "@mantine/core";
import React from "react";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import Heading from "../styled/Heading/Heading";
import PaperLayout from "../styled/Layouts/PaperLayout";

export default function DangerZone({ title, message, buttonText, onClick }) {
  return (
    <>
      <Heading
        subtitle="Danger zone"
        label="Irreversible and destructive actions"
      />
      <PaperLayout>
        <Stack align={"flex-start"} gap={"sm"}>
          <Title order={4}>{title}</Title>
          <Divider w="100%" />
          <Text>{message}</Text>
          <RateupButtonSecondary
            title={buttonText}
            color="red"
            variant="filled"
            fullWidth={false}
            onClick={onClick}
          />
        </Stack>
      </PaperLayout>
    </>
  );
}
