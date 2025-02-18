import { Avatar, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconCheck,
  IconChecks,
  IconClock,
  IconExclamationCircleFilled,
} from "@tabler/icons-react";
import dayjs from "dayjs";

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
      return { bg: "light-dark(#dcf0e4,rgb(82, 190, 127)" };
    }
    return { bg: "light-dark(#ffffff, var(--mantine-color-dark-6))" };
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
  const getLatestStatus = (statusObj: { [key: string]: string }) => {
    if (statusObj?.read) return <IconChecks size={14} color="#34B7F1" />;
    if (statusObj?.delivered) return <IconChecks size={14} color="gray" />;
    if (statusObj?.failed)
      return <IconExclamationCircleFilled size={14} color="red" />;
    if (statusObj?.sent) return <IconCheck size={14} color="gray" />;
    return <IconClock size={13} color="gray" />;
  };

  return (
    <Stack className={classes.wrapper} {...getWrapperProps()}>
      <Group gap={4}>
        <Paper className={classes.inner} {...getInnerProps()} py={2}>
          <div>
            <Text
              fz={"xs"}
              c={getColorForUser(props?.messageObject?.sender?.name)}
              fw={500}
              tt={"capitalize"}
            >
              {props?.messageObject?.sender?.name}
            </Text>
            {props?.children}
          </div>
          <Group justify="flex-end" gap={4}>
            <Text fz={10} c={"dimmed"}>
              {formatToCustomTime(props?.messageObject?.waCreatedAt)}
            </Text>
            {exchangeProcess === "send" && (
              <Text>{getLatestStatus(props?.messageObject?.stats)}</Text>
            )}
          </Group>
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
