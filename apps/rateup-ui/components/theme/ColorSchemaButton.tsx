import {
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Tooltip,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import cx from "clsx";
import classes from "./ColorSchemaButton.module.css";

export default function ColorSchemaButton() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  return (
    <Tooltip
      label={computedColorScheme === "light" ? "dark mode" : "light mode"}
      position="top"
      withArrow
    >
      <ActionIcon
        onClick={() =>
          setColorScheme(computedColorScheme === "light" ? "dark" : "light")
        }
        variant="default"
        size="xl"
        aria-label="Toggle color scheme"
        mr={"xl"}
      >
        {computedColorScheme === "light" ? (
          <IconMoon className={cx(classes.icon, classes.dark)} stroke={1.5} />
        ) : (
          <IconSun className={cx(classes.icon, classes.light)} stroke={1.5} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
