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
  WaMessagePage,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../../../backend/whatsapp/inbox/ws";
import { useUser } from "../../../../context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import WhatsAppInboxLoader from "../../../../components/whatsapp/inbox/loader";

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const [contactList, setContactList] = useState(
    [] as ContactsWithLastMessage[],
  );
  const { user } = useUser();
  const connectionRef = useRef<WebSocket | null>(null);

  const searchParams = useSearchParams();
  const { data, error } = useGetMessagesByContactId(
    searchParams.get("contactId") as string,
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

        //sort the contacts by last message timestamp
        return updatedContacts
          ?.filter((contact) => contact.lastMessage.messageBody !== null)
          ?.sort((a, b) => {
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
      setContactList(() => contactsWithLastMessage);
    }
  }, [contactsWithLastMessage]);

  useEffect(() => {
    connectionRef.current = new WebSocket(
      `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${user?.orgId}`,
    );

    connectionRef.current.onopen = () => {
      console.log("Connected to websocket");
    };

    connectionRef.current.onmessage = (event) => {
      const newMessage: { contact: ContactsData; message: WaGetMessagesBody } =
        JSON.parse(event.data);
      updateWaContactsList(newMessage);

      //when a new message arrives then we need to take the values from the queryClient and update the messages in the first page
      const currentData: {
        pages: WaMessagePage[];
        pageParams: string[];
      } = queryClient.getQueryData(["wa-messages", newMessage.contact.id]);
      if (currentData) {
        const newData = { ...currentData };
        newData.pages[0].messages.push(newMessage.message);
        queryClient.setQueryData(
          ["wa-messages", newMessage.contact.id],
          newData,
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

  if (isContactsLoading)
    return <WhatsAppInboxLoader isLoading={isContactsLoading} />;
  if (error) return <div>Error: {error.message}</div>;
  if (isContactsError) return <div>Error: {isContactsError.message}</div>;

  return (
    <MantineProvider theme={whatsappTheme}>
      <div className={classes.wrapper}>
        <Title>Inbox</Title>
        <Group className={classes.inner}>
          <WaInboxChatSelect contacts={contactList} />
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
            contact={contactList.find(
              (contact) => contact.id === searchParams.get("contactId"),
            )}
          />
        </Group>
      </div>
    </MantineProvider>
  );
}
