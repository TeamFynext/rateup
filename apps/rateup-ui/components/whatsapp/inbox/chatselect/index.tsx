import { Divider, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";
import { IconSearch } from "@tabler/icons-react";
import WaInboxChatSelectCard from "./chatselectCard";
import { ContactsWithLastMessage } from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useState } from "react";
import { useDebouncedValue, useElementSize } from "@mantine/hooks";
import { parseWaMessage } from "../../../../utils/whatsapp/inbox";
import { FixedSizeList as List } from "react-window";
export default function WaInboxChatSelect(props: {
  contacts: ContactsWithLastMessage[];
}) {
  const { ref, width, height } = useElementSize();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
  const [filter, setFilter] = useState<"all" | "usermessages">("all");

  if (!props.contacts) {
    return null;
  }
  const contactsWithAtleastOneMessage = props.contacts?.filter(
    (c) => c.lastMessage?.messageBody !== null,
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

  function filterContacts(contacts: ContactsWithLastMessage[]) {
    if (filter === "all") {
      return contacts;
    } else {
      return contacts.filter((c) => {
        if (c.lastMessage.messageBody.exchangeProcess === "receive") {
          const { messageType } = parseWaMessage(c.lastMessage.messageBody);
          return messageType !== "interactive";
        }
      });
    }
  }

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
                {filterContacts(contactListToDisplay)?.length || 0} Chats
              </Text>
            </Group>
          </Stack>
          <SegmentedControl
            value={filter}
            onChange={(value) => setFilter(value as "all" | "usermessages")}
            data={[
              { value: "all", label: "All" },
              { value: "usermessages", label: "User Messages" },
            ]}
            color={"var(--mantine-primary-color-6)"}
            radius={"md"}
          />
        </Group>
      </Stack>
      <Divider />
      <div className={classes.chat_cards_wrapper} ref={ref}>
        <List
          height={height}
          width={width}
          itemCount={filterContacts(contactListToDisplay)?.length || 0}
          itemSize={69}
        >
          {({ index, style }) => {
            // Get the contact for this index
            const contact = filterContacts(contactListToDisplay)[index];

            // Render the item
            return (
              <div style={style}>
                <WaInboxChatSelectCard key={contact.id} contact={contact} />
              </div>
            );
          }}
        </List>
      </div>
    </Stack>
  );
}
