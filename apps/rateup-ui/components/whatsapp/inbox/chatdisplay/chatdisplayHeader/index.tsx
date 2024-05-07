import { Avatar, Group, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import WaInboxCountdownTimer from "./countDown";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatDisplayHeader({
  contact,
}: WaInboxChatDisplayHeaderProps) {
  if (!contact) return null;
  return (
    <div className={classes.wrapper}>
      <Group>
        <Avatar color="var(--mantine-primary-color-6)" size={65}>
          {getFirstLetterFromNameByExcludingSpecialCharacters(contact?.name)}
        </Avatar>
        <Stack className={classes.name_phone_wrapper}>
          <Text className={classes.name}>{contact.name}</Text>
          <Text className={classes.phone}>{contact.phone}</Text>
        </Stack>
      </Group>
      <WaInboxCountdownTimer timeStamp={contact?.userInitiatedFinalTimeStamp} />
    </div>
  );
}

function getFirstLetterFromNameByExcludingSpecialCharacters(name: string) {
  return name?.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase();
}
