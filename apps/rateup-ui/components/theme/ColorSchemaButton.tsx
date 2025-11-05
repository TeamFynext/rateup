"use client";

import {
  Box,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import cx from "clsx";
import { useTheme } from "next-themes";

import classes from "./ColorSchemaButton.module.css";

export default function ColorSchemaButton() {
  const { setColorScheme } = useMantineColorScheme();
  const { setTheme } = useTheme();

  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  return (
    <Box
      onClick={() => {
        setColorScheme(computedColorScheme === "light" ? "dark" : "light");
        setTheme(computedColorScheme === "light" ? "dark" : "light");
      }}
      variant="default"
      size="xl"
      aria-label="Toggle color scheme"
      className="mr-2"
    >
      <IconSun className={cx(classes.icon, classes.light)} strokeWidth={2} />
      <IconMoon className={cx(classes.icon, classes.dark)} strokeWidth={2} />
    </Box>
  );
}
