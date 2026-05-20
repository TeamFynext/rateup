import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import ETESettings from "../../../../components/dashboard/settings/advanced/EteSettings.tsx";

const Index = () => {
  return (
    <Stack p={"xl"}>
      <ETESettings />
    </Stack>
  );
};
export const Route = createFileRoute("/dashboard/apps&services/encryption/")({
  component: Index,
});
