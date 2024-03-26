import { Group, Paper, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import { WaGetMessagesBody } from "../../../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { formatToCustomTime } from "../../../../../../../utils/dateTime";
interface Props {
  exchangeProcess: "send" | "receive";
  messageObject: WaGetMessagesBody;
  children: any;
}
export default function WaInboxSingleMessageLayout(props: Props) {
  const { exchangeProcess, messageObject } = props;

  function getWrapperProps() {
    if (exchangeProcess === "send") {
      return { align: "end" };
    }
    return { align: "start" };
  }

  function getInnerProps() {
    if (exchangeProcess === "send") {
      return { bg: "#dcf0e4" };
    }
    return { bg: "#ffffff" };
  }

  return (
    <Stack className={classes.wrapper} {...getWrapperProps()}>
      <Paper className={classes.inner} {...getInnerProps()}>
        {props?.children}
      </Paper>
      <Text fz={10}>
        {formatToCustomTime(props?.messageObject?.waCreatedAt)}
      </Text>
    </Stack>
  );
}
