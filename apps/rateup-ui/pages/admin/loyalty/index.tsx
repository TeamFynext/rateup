import React from "react";

import { Stack } from "@mantine/core";

import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import LoyaltySettings from "./LoyaltySettings";
import RegisterPageShare from "./RegisterPageShare";

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
