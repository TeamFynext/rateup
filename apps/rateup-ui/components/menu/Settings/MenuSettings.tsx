import React from "react";
import { Stack } from "@mantine/core";
import GeneralSettings from "./GeneralSettings";

const MenuSettings = ({ menu }) => {
  return (
    <Stack p={"sm"}>
      <GeneralSettings editingItem={menu} />
    </Stack>
  );
};

export default MenuSettings;
