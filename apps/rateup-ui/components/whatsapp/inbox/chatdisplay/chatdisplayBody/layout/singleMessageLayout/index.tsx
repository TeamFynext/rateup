import { Group, Paper } from "@mantine/core";
import classes from "./styles.module.css";
interface Props {
  exchangeProcess: "send" | "receive";
  children: any;
}
export default function WaInboxSingleMessageLayout(props: Props) {
  const { exchangeProcess } = props;

  function getWrapperProps() {
    if (exchangeProcess === "send") {
      return { justify: "end" };
    }
    return { justify: "start" };
  }

  function getInnerProps() {
    if (exchangeProcess === "send") {
      return { bg: "#dcf0e4" };
    }
    return { bg: "#ffffff" };
  }

  return (
    <Group className={classes.wrapper} {...getWrapperProps()}>
      <Paper className={classes.inner} {...getInnerProps()}>
        {props?.children}
      </Paper>
    </Group>
  );
}
