import { Box } from "@mantine/core";

import { WaSendMessageBody } from "../../../../../../../types/global";
import WaInboxInteractiveComponents from "./components";
import classes from "./styles.module.css";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractive(props: Props) {
  return (
    <Box className={classes.interactive_wrapper}>
      <WaInboxInteractiveComponents
        interactiveBody={props?.interactiveBody}
        messageContent={props?.messageContent}
      />
    </Box>
  );
}
