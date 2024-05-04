import { Group, Loader, MantineProvider, Title } from "@mantine/core";
import classes from "./styles.module.css";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import { whatsappTheme } from "../../../../config/mantineTheme";
import { useSearchParams } from "next/navigation";
import {
  useContactsWithLastMessage,
  useGetMessagesByContactId,
} from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../../../backend/whatsapp/inbox/ws";
import { useUser } from "../../../../context/UserContext";
import { useInboxPaginationStore } from "../../../../components/whatsapp/inbox/inbox.store";
import { useQueryClient } from "@tanstack/react-query";

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const page = useInboxPaginationStore((state) => state.page);
  const messages = useInboxPaginationStore((state) => state.messages);
  const setMessages = useInboxPaginationStore((state) => state.setMessages);
  const appendMessages = useInboxPaginationStore(
    (state) => state.appendMessages,
  );
  const prependMessages = useInboxPaginationStore(
    (state) => state.prependMessages,
  );
  const setMessageLoading = useInboxPaginationStore(
    (state) => state.setMessageLoading,
  );
  const setCurrentMessageCount = useInboxPaginationStore(
    (state) => state.setCurrentMessageCount,
  );

  const [contactList, setContactList] = useState(
    [] as ContactsWithLastMessage[],
  );
  const { user } = useUser();
  const connectionRef = useRef<WebSocket | null>(null);

  const searchParams = useSearchParams();
  const { data, isLoading, error } = useGetMessagesByContactId(
    searchParams.get("contactId") as string,
    page,
  );

  const {
    data: contactsWithLastMessage,
    isLoading: isContactsLoading,
    error: isContactsError,
  } = useContactsWithLastMessage();

  const updateWaContactsList = useCallback(
    (newMessage: { contact: ContactsData; message: WaGetMessagesBody }) => {
      setContactList((prevList) => {
        let updatedContacts = [...prevList];
        const contactIndex = updatedContacts.findIndex(
          (contact) => contact.id === newMessage.contact.id,
        );
        if (contactIndex !== -1) {
          // update the existiing contact with new message
          updatedContacts[contactIndex] = {
            ...updatedContacts[contactIndex],
            lastMessage: newMessage?.message,
            userInitiatedFinalTimeStamp:
              newMessage.message.messageBody.exchangeProcess === "receive"
                ? newMessage.message.waCreatedAt
                : updatedContacts[contactIndex].userInitiatedFinalTimeStamp,
          };
        } else {
          //add new contact with new message
          updatedContacts = [
            ...updatedContacts,
            {
              ...newMessage.contact,
              lastMessage: newMessage.message,
              userInitiatedFinalTimeStamp:
                newMessage.message.messageBody.exchangeProcess === "receive"
                  ? newMessage.message.waCreatedAt
                  : updatedContacts[contactIndex].userInitiatedFinalTimeStamp,
            },
          ];
        }

        //sort the contacts by last message
        updatedContacts
          ?.filter((contact) => contact.lastMessage.messageBody !== null)
          ?.sort((a, b) => {
            const aDate = new Date(a.lastMessage.waCreatedAt);
            const bDate = new Date(b.lastMessage.waCreatedAt);
            return bDate.getTime() - aDate.getTime();
          });

        return updatedContacts;
      });
    },
    [],
  );

  useEffect(() => {
    if (contactsWithLastMessage) {
      setContactList(() => contactsWithLastMessage);
    }
  }, [contactsWithLastMessage]);

  useEffect(() => {
    if (data) {
      setCurrentMessageCount(data.length);
      const reversedArray = data.toReversed();
      if (page === 1) {
        setMessages(reversedArray);
      } else {
        setTimeout(() => {
          setMessageLoading(false, "prepend");
          //we should only prepend the messages if  and only if all the messages in reversedArray are not present in messages
          // Check if every message in reversedArray is not present in messages
          const shouldPrepend = reversedArray.every(
            (msg) => !messages.find((m) => m.id === msg.id),
          );
          if (shouldPrepend) {
            // If none of the messages in reversedArray are present in messages,
            // prepend reversedArray to messages
            prependMessages(reversedArray);
          }
        }, 500);
      }
    }
  }, [data]);

  useEffect(() => {
    connectionRef.current = new WebSocket(
      `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${user?.orgId}`,
    );

    connectionRef.current.onopen = () => {
      console.log("Connected to websocket");
    };

    connectionRef.current.onmessage = (event) => {
      const contactId = new URLSearchParams(window.location.search).get(
        "contactId",
      );
      const newMessage: { contact: ContactsData; message: WaGetMessagesBody } =
        JSON.parse(event.data);
      updateWaContactsList(newMessage);
      if (newMessage.contact.id === contactId) {
        appendMessages([newMessage.message]);
        queryClient.setQueryData(
          ["wa-messages", newMessage.contact.id, 1],
          (oldData: WaGetMessagesBody[]) => {
            // Check if the message is already present in the data
            if (!oldData.find((msg) => msg.id === newMessage.message.id)) {
              // If not, append the new message
              return [newMessage.message, ...oldData];
            }
            // If the message is already present, return the old data
            return oldData;
          },
        );
      }
    };

    connectionRef.current.onclose = () => {
      console.log("Disconnected from websocket");
    };

    return () => {
      connectionRef.current?.close();
    };
  }, [updateWaContactsList]);

  if (isLoading || isContactsLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  if (isContactsError) return <div>Error: {isContactsError.message}</div>;

  return (
    <MantineProvider theme={whatsappTheme}>
      <div className={classes.wrapper}>
        <Title>Inbox</Title>
        <Group className={classes.inner}>
          <WaInboxChatSelect contacts={contactList} />
          <WaInboxChatDisplay
            messages={messages}
            contact={contactList.find(
              (contact) => contact.id === searchParams.get("contactId"),
            )}
          />
        </Group>
      </div>
    </MantineProvider>
  );
}
