import { Avatar, Group, Paper, Stack, Text } from "@mantine/core";

import { WaGetMessagesBody } from "../../../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { formatToCustomTime } from "../../../../../../../utils/dateTime";
import classes from "./styles.module.css";

interface Props {
  exchangeProcess: "send" | "receive";
  messageObject: WaGetMessagesBody;
  children: any;
  forPreview?: boolean;
}
export default function WaInboxSingleMessageLayout(props: Props) {
  const { exchangeProcess } = props;

  function getWrapperProps() {
    if (exchangeProcess === "send") {
      return {
        align: "end",
        w: props?.forPreview ? "fit-content" : "100%",
      };
    }
    return { align: "start" };
  }

  function getInnerProps() {
    if (exchangeProcess === "send") {
      return { bg: "#dcf0e4" };
    }
    return { bg: "#ffffff" };
  }
  const getColorForUser = (userName = "") => {
    const colors = [
      "#1E90FF", // Blue
      "#32CD32", // Green
      "#FF4500", // Red
      "#8A2BE2", // Purple
      "#20B2AA", // Teal
      "#FFA500", // Orange
      "#00CED1", // Cyan
      "#FF69B4", // Pink
      "#FFD700", // Yellow
      "#4B0082", // Indigo
    ];
    // Create a simple hash from the user's name (or other identifier)
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Map the hash to a color
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };
  return (
    <Stack className={classes.wrapper} {...getWrapperProps()}>
      <Group gap={4}>
        <Paper className={classes.inner} {...getInnerProps()} py={2}>
          <div>
            <Text
              fz={"xs"}
              c={getColorForUser(props?.messageObject?.sender?.name)}
              fw={700}
              tt={"capitalize"}
            >
              {props?.messageObject?.sender?.name}
            </Text>
            {props?.children}
          </div>
          <Text fz={10} c={"dimmed"} ml={"xl"}>
            {formatToCustomTime(props?.messageObject?.waCreatedAt)}
          </Text>
        </Paper>
        {exchangeProcess === "send" && (
          <Avatar
            name={props?.messageObject?.sender?.name}
            color="initials"
            src={props?.messageObject?.sender?.profile_photo}
            size={"sm"}
            mb={"auto"}
          />
        )}
      </Group>
    </Stack>
  );
}
