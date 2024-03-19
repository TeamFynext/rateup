import {
  Divider,
  Group,
  Loader,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import classes from "./styles.module.css";
import { IconSearch } from "@tabler/icons-react";
import WaInboxChatSelectCard from "./chatselectCard";
import AddWaContactModal from "./addwaContactModal";
import { useGetAllWaContacts } from "../../../../backend/whatsapp/inbox/contact/wacontact.query";
export default function WaInboxChatSelect() {
  const { data, isLoading, error } = useGetAllWaContacts();
  if (isLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  return (
    <Stack className={classes.wrapper}>
      <Stack className={classes.chat_select_header}>
        <ContainedTextField
          leftSection={<IconSearch />}
          placeholder="Search Contacts"
        />
        <Group className={classes.chat_select_header_filter_add_section}>
          <Stack gap={0}>
            <Text className={classes.chat_select_filter_text}>All Chats</Text>
            <Group className={classes.chat_select_filter_indicator_wrapper}>
              <Text className={classes.chat_indicator_text}>
                {data?.length} Chats
              </Text>
              {/* <div className={classes.dot}></div> */}
              {/* <Text className={classes.chat_indicator_text}>200 unread</Text> */}
            </Group>
          </Stack>
          <AddWaContactModal />
        </Group>
      </Stack>
      <Divider />
      <div className={classes.chat_cards_wrapper}>
        {data?.map((contact) => (
          <WaInboxChatSelectCard key={contact.id} {...contact} />
        ))}
      </div>
    </Stack>
  );
}
