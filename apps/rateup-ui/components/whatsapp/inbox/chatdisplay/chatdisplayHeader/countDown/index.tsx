import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Badge, Loader, RingProgress, Text } from "@mantine/core";
import classes from "./styles.module.css";
import { isInboxSessionExpired } from "../../../../../../utils/whatsapp/inbox";
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
    }, 1000);
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
    <RingProgress
      sections={[
        {
          color: "var(--mantine-primary-color-5)",
          value: percentageDifference,
        },
      ]}
      size={65}
      thickness={5}
      roundCaps
      label={
        <Text
          className={classes.timer_text}
        >{`${hours ?? 0} : ${minutes ?? 0}`}</Text>
      }
    />
  );
}
