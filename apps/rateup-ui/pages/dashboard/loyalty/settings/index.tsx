import { Stack } from "@mantine/core";

import LoyaltySettings from "@/components/Loyalty/LoyaltySettings";
import RegisterPageShare from "@/components/Loyalty/RegisterPageShare";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const index = () => {
  return (
    <Stack gap={"md"}>
      <PaperLayout>
        <RegisterPageShare />
      </PaperLayout>
      <LoyaltySettings />
    </Stack>
  );
};

export default index;
