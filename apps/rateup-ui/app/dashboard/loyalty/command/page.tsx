import { Stack } from "@mantine/core";

import LoyaltySettings from "@/components/LoyaltyComponents/LoyaltySettings";
import RegisterPageShare from "@/components/LoyaltyComponents/RegisterPageShare";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const index = () => {
  return (
    <Stack gap={"md"} m={"xs"}>
      <PaperLayout>
        <RegisterPageShare />
      </PaperLayout>
      <LoyaltySettings />
    </Stack>
  );
};

export default index;
