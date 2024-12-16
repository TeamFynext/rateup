import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Group, MantineProvider, Stack, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
  WaMessagePage,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useContactsWithLastMessage,
  useGetMessagesByContactId,
  useMessageCount,
} from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import WhatsAppInboxLoader from "../../../../components/whatsapp/inbox/loader";
import { whatsappTheme } from "../../../../config/mantineTheme";
import { useWsData } from "../../../../context/UserContext";
import ChatDisplayContext from "./ChatDisplayContext";
import styles from "./WhatsappInbox.module.css";

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const [contactList, setContactList] = useState(
    [] as ContactsWithLastMessage[],
  );
  const [filteredContactList, setFilteredContactList] = useState(
    [] as ContactsWithLastMessage[],
  );
  const [newlyAddedContact, setNewlyAddedContact] =
    useState<ContactsWithLastMessage | null>(null);
  const { wsData } = useWsData();

  const searchParams = useSearchParams();
  const { data, error } = useGetMessagesByContactId(
    searchParams.get("contactId") as string,
  );
  const {
    data: contactsWithLastMessage,
    isLoading: isContactsFetching,
    error: isContactsError,
  } = useContactsWithLastMessage();
  const { data: messageCount, isPending } = useMessageCount();

  function findAndReturnTheIndexOfTheContact(
    list: ContactsWithLastMessage[],
    contactId: string,
  ) {
    return list.findIndex((contact) => contact.id === contactId);
  }

  function updateTheContactObject(
    cObj: ContactsWithLastMessage,
    newMessage: WaGetMessagesBody,
  ) {
    return {
      ...cObj,
      lastMessage: newMessage,
      userInitiatedFinalTimeStamp:
        newMessage.messageBody.exchangeProcess === "receive"
          ? newMessage.waCreatedAt
          : cObj?.userInitiatedFinalTimeStamp,
    };
  }

  const updateWaContactsList = useCallback(
    (newMessage: { contact: ContactsData; message: WaGetMessagesBody }) => {
      setContactList((prevList) => {
        let updatedContacts = [...prevList];
        const contactIndex = findAndReturnTheIndexOfTheContact(
          updatedContacts,
          newMessage.contact.id,
        );
        findAndReturnTheIndexOfTheContact(
          updatedContacts,
          newMessage.contact.id,
        );
        if (contactIndex !== -1) {
          // update the existiing contact with new message
          updatedContacts[contactIndex] = updateTheContactObject(
            updatedContacts[contactIndex],
            newMessage.message,
          );
        } else {
          queryClient.invalidateQueries({
            queryKey: ["contacts", "last-message"],
          });
        }
        //sort the contacts by last message timestamp
        return updatedContacts?.sort((a, b) => {
          const aDate = new Date(a.lastMessage.waCreatedAt);
          const bDate = new Date(b.lastMessage.waCreatedAt);
          return bDate.getTime() - aDate.getTime();
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (contactsWithLastMessage) {
      setContactList(
        contactsWithLastMessage?.pages?.map((page) => page).flat(),
      );
    }
  }, [contactsWithLastMessage]);

  useEffect(() => {
    if (wsData && wsData.type === "inbox") {
      updateWaContactsList(wsData.inbox);
      //when a new message arrives then we need to take the values from the queryClient and update the messages in the first page
      const currentData: {
        pages: WaMessagePage[];
        pageParams: string[];
      } = queryClient.getQueryData(["wa-messages", wsData.inbox.contact.id]);
      if (currentData) {
        const newData = { ...currentData };
        if (!newData.pages[0].messages.includes(wsData.inbox.message)) {
          newData.pages[0].messages.push(wsData.inbox.message);
          queryClient.setQueryData(
            ["wa-messages", wsData.inbox.contact.id],
            newData,
          );
        }
      }
    }
  }, [wsData]);

  if (isContactsFetching || isPending)
    return <WhatsAppInboxLoader isLoading={isContactsFetching || isPending} />;
  if (error) return <div>Error: {error.message}</div>;
  if (isContactsError) return <div>Error: {isContactsError.message}</div>;

  return (
    <MantineProvider theme={whatsappTheme}>
      <ChatDisplayContext>
        <Stack className={styles["whatsapp-inbox-root-div"]}>
          <Group className={styles["chat-selector-and-chat-container"]}>
            <WaInboxChatSelect
              setNewlyAdddedContact={setNewlyAddedContact}
              contacts={contactList}
              setFilteredContacts={setFilteredContactList}
              messageCount={messageCount}
            />
            <WaInboxChatDisplay
              messages={
                data?.pages
                  .map((page) =>
                    page.messages.sort(
                      (a, b) =>
                        new Date(a.waCreatedAt).getTime() -
                        new Date(b.waCreatedAt).getTime(),
                    ),
                  )
                  .flat() || []
              }
              contact={
                contactList.find(
                  (contact) => contact.id === searchParams.get("contactId"),
                ) ??
                filteredContactList.find(
                  (contact) => contact.id === searchParams.get("contactId"),
                ) ??
                newlyAddedContact
              }
            />
          </Group>
        </Stack>
      </ChatDisplayContext>
    </MantineProvider>
  );
}
