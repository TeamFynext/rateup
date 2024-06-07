import { Group, MantineProvider, Title } from "@mantine/core";
import classes from "./styles.module.css";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import { whatsappTheme } from "../../../../config/mantineTheme";
import { useSearchParams } from "next/navigation";
import {
  useContactsWithLastMessage,
  useGetMessagesByContactId,
} from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useCallback, useEffect, useState } from "react";
import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
  WaMessagePage,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useWsData } from "../../../../context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import WhatsAppInboxLoader from "../../../../components/whatsapp/inbox/loader";

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const [contactList, setContactList] = useState(
    [] as ContactsWithLastMessage[],
  );
  const [filteredContactList, setFilteredContactList] = useState(
    [] as ContactsWithLastMessage[],
  );
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

  if (isContactsFetching)
    return <WhatsAppInboxLoader isLoading={isContactsFetching} />;
  if (error) return <div>Error: {error.message}</div>;
  if (isContactsError) return <div>Error: {isContactsError.message}</div>;

  return (
    <MantineProvider theme={whatsappTheme}>
      <div className={classes.wrapper}>
        <Title>Inbox</Title>
        <Group className={classes.inner}>
          <WaInboxChatSelect
            contacts={contactList}
            setFilteredContacts={setFilteredContactList}
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
              )
            }
          />
        </Group>
      </div>
    </MantineProvider>
  );
}
