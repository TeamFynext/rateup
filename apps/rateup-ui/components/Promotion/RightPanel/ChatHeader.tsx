import { useMantineTheme, Group, Text } from "@mantine/core";
import classes from './style.module.css'
import { IconChevronRight } from "@tabler/icons-react";

export function MainWindowHeader({ title, onClick }) {
  return (
    <Group
      className={classes.chatHeader}
      onClick={onClick}
      p={"lg"}
      mih={"75px"}
      justify="space-between"
    >
      <Text>{title}</Text>
      <IconChevronRight />
    </Group>
  )
}