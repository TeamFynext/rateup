import { ActionIcon, Avatar, Group, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import WaInboxCountdownTimer from "./countDown";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { IconArrowLeft } from "@tabler/icons-react";
import { useSetIsChatDisplayOpen } from "../../../../../pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect } from "react";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatDisplayHeader({
  contact,
}: WaInboxChatDisplayHeaderProps) {
  if (!contact) return null;

  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const isMobile = useMediaQuery("(max-width: 1200px)");

  return (
    <div className={classes.wrapper}>
      <Group>
        {isMobile && (
          <ActionIcon
            variant="subtle"
            onClick={() => {
              setIsChatDisplayOpen(false);
            }}
          >
            <IconArrowLeft size={!isMobile ? 28 : 20} />
          </ActionIcon>
        )}

        <Avatar
          color="var(--mantine-primary-color-6)"
          size={!isMobile ? 65 : 35}
        >
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
