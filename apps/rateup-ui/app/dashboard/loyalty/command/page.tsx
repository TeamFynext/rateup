import { Stack } from "@mantine/core";

import InfoButton from "@/components/Button/InfoButton";
import LoyaltySettings from "@/components/LoyaltyComponents/LoyaltySettings";
import RegisterPageShare from "@/components/LoyaltyComponents/RegisterPageShare";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { docsPath } from "@/utils/constants";

const index = () => {
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
};

export default index;
