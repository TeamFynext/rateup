import { ActionIcon } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";

import classes from "./styles.module.css";

export default function ActionButtonTrigger(props: { onClick: () => void }) {
  return (
    <ActionIcon
      variant="light"
      className={classes.action_icon}
      onClick={props.onClick}
    >
      <IconUserPlus />
    </ActionIcon>
  );
}
