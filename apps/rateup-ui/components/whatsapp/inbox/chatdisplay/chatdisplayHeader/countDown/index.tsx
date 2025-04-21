import React, { useEffect, useState } from "react";

import {
  Badge,
  Loader,
  Progress,
  RingProgress,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconPointFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { isInboxSessionExpired } from "../../../../../../utils/whatsapp/inbox";
import classes from "./styles.module.css";

dayjs.extend(utc);

export default function WaInboxCountdownTimer({
  timeStamp,
}: {
  timeStamp: string;
}) {
  const calculateTimeLeft = () =>
    dayjs(dayjs(timeStamp).add(24, "hour")).diff(dayjs(), "second");

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 5000);
    return () => clearInterval(intervalId);
  }, [timeStamp]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const percentageDifference = (timeLeft / (24 * 3600)) * 100;

  if (!timeStamp || isInboxSessionExpired(timeStamp)) {
    return (
      <Badge variant="light" fz={10} color="red">
        No Session
      </Badge>
    );
  }
  if (!percentageDifference || !timeStamp) {
    return <Loader size={"xs"} />;
  }
  return (
    <Tooltip label={"Session"}>
      <Stack gap={2}>
        <Text
          className={classes.timer_text}
          fw={500}
        >{`${hours ?? 0} : ${minutes ?? 0}`}</Text>
        <Progress
          size={"md"}
          value={Math.floor((hours * 100) / 24)}
          w={120}
          color={hours === 1 && "red"}
        />
      </Stack>
    </Tooltip>
  );
}
