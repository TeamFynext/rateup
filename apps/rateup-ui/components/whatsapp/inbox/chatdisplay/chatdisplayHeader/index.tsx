import { Avatar, Group, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import WaInboxCountdownTimer from "./countDown";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useGetMessagesByContactId } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useContactById } from "../../../../../backend/campaign/contacts/contacts.query";
import dayjs from "dayjs";

interface WaInboxChatDisplayHeaderProps {
  contactId: string;
}
export default function WaInboxChatDisplayHeader({
  contactId,
}: WaInboxChatDisplayHeaderProps) {
  const { data: contact } = useContactById(contactId);
  if (!contact) return null;

  const { data: messages } = useGetMessagesByContactId(contactId);

  const lastUserMessageTimeStamp = messages
    ?.filter((m) => m.messageBody.exchangeProcess === "receive")
    .sort(
      (a, b) =>
        new Date(b.waCreatedAt).getTime() - new Date(a.waCreatedAt).getTime(),
    )[0]?.waCreatedAt;
  console.log("lastUserMessageTimeStamp", lastUserMessageTimeStamp);
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
      <WaInboxCountdownTimer timeStamp={lastUserMessageTimeStamp} />
    </div>
  );
}

function getFirstLetterFromNameByExcludingSpecialCharacters(name: string) {
  return name?.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase();
}
