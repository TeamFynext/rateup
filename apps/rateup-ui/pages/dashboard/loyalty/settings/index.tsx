import { Stack } from "@mantine/core";

import LoyaltySettings from "@/components/loyalty/LoyaltySettings";
import RegisterPageShare from "@/components/loyalty/RegisterPageShare";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const index = () => {
  return (
    <Stack>
      <PaperLayout>
        <RegisterPageShare />
      </PaperLayout>
      <PaperLayout>
        <LoyaltySettings />
      </PaperLayout>
    </Stack>
  );
};

export default index;
