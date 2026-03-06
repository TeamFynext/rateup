import React from "react";

import { Stack } from "@mantine/core";

import GeneralSettings from "./GeneralSettings";

const MenuSettings = ({ menuLandingData }) => {
  return (
    <Stack p={"sm"}>
      <GeneralSettings editingItem={menuLandingData} />
    </Stack>
  );
};

export default MenuSettings;
