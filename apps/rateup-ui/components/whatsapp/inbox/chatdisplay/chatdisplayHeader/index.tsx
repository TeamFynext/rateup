import { Avatar, Group, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import { WaContact } from "../../../../../types/global";
import WaInboxCountdownTimer from "./countDown";
export default function WaInboxChatDisplayHeader(props: WaContact) {
  function getFirstLetterFromNameByExcludingSpecialCharacters(name: string) {
    return name?.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase();
  }
  return (
    <div className={classes.wrapper}>
      <Group>
        <Avatar color="var(--mantine-primary-color-6)" size={65}>
          {getFirstLetterFromNameByExcludingSpecialCharacters(props?.name)}
        </Avatar>
        <Stack className={classes.name_phone_wrapper}>
          <Text className={classes.name}>{props.name}</Text>
          <Text className={classes.phone}>{props.phone}</Text>
        </Stack>
      </Group>
      <WaInboxCountdownTimer timeStamp={props?.userInitiatedFinalTimeStamp} />
    </div>
  );
}
