import {
  ActionIcon,
  Group,
  Switch,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import cx from "clsx";

import RateupSwitch from "../Switch/RateupSwitch";
import classes from "./ColorSchemaButton.module.css";

export default function ColorSchemaButton() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const theme = useMantineTheme();
  const isLight = computedColorScheme === "light";

  const toggleColorScheme = () => {
    setColorScheme(isLight ? "dark" : "light");
  };

  return (
    <Group>
      <IconSun
        className={cx(classes.icon, isLight ? classes.active : "")}
        size={18}
        stroke={1.5}
      />
      <Switch
        checked={!isLight} // checked is true when in dark mode
        onChange={toggleColorScheme}
        styles={{
          track: {
            backgroundColor: isLight
              ? theme.colors.gray[6]
              : theme.colors.dark[4],
          },
        }}
      />
      <IconMoon
        className={cx(classes.icon, !isLight ? classes.active : "")}
        size={18}
        stroke={1.5}
      />
    </Group>
  );
}
