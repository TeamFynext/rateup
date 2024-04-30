import { Divider, Group, Stack, Text } from "@mantine/core";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";
import { IconSearch } from "@tabler/icons-react";
import WaInboxChatSelectCard from "./chatselectCard";
import { ContactsWithLastMessage } from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";
export default function WaInboxChatSelect(props: {
  contacts: ContactsWithLastMessage[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  if (!props.contacts) {
    return null;
  }
  const contactsWithAtleastOneMessage = props.contacts?.filter(
    (c) => c.WaMessage.length > 0,
  );
  const lowerCaseDebouncedSearchTerm = debouncedSearchTerm.toLowerCase();
  const filteredContacts = props.contacts?.filter(
    (c) =>
      c.name?.toLowerCase().includes(lowerCaseDebouncedSearchTerm) ||
      c.phone?.includes(lowerCaseDebouncedSearchTerm),
  );
  const contactListToDisplay = debouncedSearchTerm
    ? filteredContacts
    : contactsWithAtleastOneMessage;

  return (
    <Stack className={classes.wrapper}>
      <Stack className={classes.chat_select_header}>
        <ContainedTextField
          leftSection={<IconSearch />}
          placeholder="Search Contacts"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
        <Group className={classes.chat_select_header_filter_add_section}>
          <Stack gap={0}>
            <Text className={classes.chat_select_filter_text}>All Chats</Text>
            <Group className={classes.chat_select_filter_indicator_wrapper}>
              <Text className={classes.chat_indicator_text}>
                {contactsWithAtleastOneMessage?.length} Chats
              </Text>
              {/* <div className={classes.dot}></div> */}
              {/* <Text className={classes.chat_indicator_text}>200 unread</Text> */}
            </Group>
          </Stack>
        </Group>
      </Stack>
      <Divider />
      <div className={classes.chat_cards_wrapper}>
        {contactListToDisplay?.map((contact) => (
          <WaInboxChatSelectCard key={contact.id} contact={contact} />
        ))}
      </div>
    </Stack>
  );
}
