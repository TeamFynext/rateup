import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import InfoButton from "@/components/Button/InfoButton.tsx";
import LoyaltySettings from "@/components/LoyaltyComponents/LoyaltySettings.tsx";
import RegisterPageShare from "@/components/LoyaltyComponents/RegisterPageShare.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { docsPath } from "@/utils/constants.ts";

export const Route = createFileRoute("/dashboard/loyalty/command/")({
  component: Index,
});

function Index() {
  return (
    <div className="div">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-2xl mb-1">Commands</h1>
          <p className="text-sm text-muted-foreground">
            Configure commands that activate automated actions.
          </p>
        </div>
        <InfoButton docUrl={`${docsPath}/loyality/commands`} />
      </div>
      <Stack gap={"md"} m={"xs"}>
        <PaperLayout>
          <RegisterPageShare />
        </PaperLayout>
        <LoyaltySettings />
      </Stack>
    </div>
  );
}
