import { Group, Loader, MantineProvider, Title } from "@mantine/core";
import classes from "./styles.module.css";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import { whatsappTheme } from "../../../../config/mantineTheme";
import { useSearchParams } from "next/navigation";
import { useGetMessagesByWaContactId } from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useGetAllWaContacts } from "../../../../backend/whatsapp/inbox/contact/wacontact.query";
import { useEffect, useRef, useState, useCallback } from "react";
import { WaGetMessagesBody } from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../../../backend/whatsapp/inbox/ws";
import { WaContact } from "../../../../types/global";
import dayjs from "dayjs";
import { useUser } from "../../../../context/UserContext";

export default function WhatsAppInbox() {
  const [messages, setMessages] = useState([] as WaGetMessagesBody[]);
  const [waContacts, setWaContacts] = useState([] as WaContact[]);
  const { user } = useUser();
  const connectionRef = useRef<WebSocket | null>(null);

  const searchParams = useSearchParams();
  let contactId = searchParams.get("waContactId");
  const { data, isLoading, error } = useGetMessagesByWaContactId(
    contactId as string,
  );
  const {
    data: allWaContacts,
    isLoading: isALLWaContactsLoading,
    error: waAllContactsError,
  } = useGetAllWaContacts();

  const updateWaContacts = useCallback(
    (newMessage: { contact: WaContact; message: WaGetMessagesBody }) => {
      setWaContacts((prevContacts) => {
        let updatedContacts = [...prevContacts];
        const existingContactIndex = updatedContacts.findIndex(
          (contact) => contact.id === newMessage.contact.id,
        );

        if (existingContactIndex !== -1) {
          // Update the existing contact
          updatedContacts[existingContactIndex] = {
            ...updatedContacts[existingContactIndex],
            lastMessage: newMessage.message,
            updatedAt: newMessage?.contact?.updatedAt,
            userInitiatedFinalTimeStamp:
              newMessage.message.messageBody.exchangeProcess === "receive"
                ? newMessage.message.waCreatedAt
                : updatedContacts[existingContactIndex]
                    .userInitiatedFinalTimeStamp,
          };
        } else {
          // Add the new contact
          updatedContacts.push({
            ...newMessage.contact,
            lastMessage: newMessage.message,
            updatedAt: newMessage?.contact?.updatedAt,
            userInitiatedFinalTimeStamp:
              newMessage.message.messageBody.exchangeProcess === "receive"
                ? newMessage.message.waCreatedAt
                : newMessage.contact.userInitiatedFinalTimeStamp,
          });
        }

        // Sort the contacts by the userInitiatedFinalTimeStamp property
        updatedContacts.sort(
          (a, b) => dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix(),
        );
        return updatedContacts;
      });
    },
    [],
  );

  useEffect(() => {
    if (allWaContacts) {
      setWaContacts(allWaContacts);
    }
  }, [allWaContacts]);

  useEffect(() => {
    if (data) {
      setMessages(() => data);
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
      const wacontactId = new URLSearchParams(window.location.search).get(
        "waContactId",
      );
      const newMessage: { contact: WaContact; message: WaGetMessagesBody } =
        JSON.parse(event.data);
      updateWaContacts(newMessage);
      if (newMessage.contact.id === wacontactId) {
        setMessages((prevMessages) => [...prevMessages, newMessage.message]);
      }
    };

    connectionRef.current.onclose = () => {
      console.log("Disconnected from websocket");
    };

    return () => {
      connectionRef.current?.close();
    };
  }, [updateWaContacts]);

  if (isLoading || isALLWaContactsLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  if (waAllContactsError) return <div>Error: {waAllContactsError.message}</div>;

  return (
    <MantineProvider theme={whatsappTheme}>
      <div className={classes.wrapper}>
        <Title>Inbox</Title>
        <Group className={classes.inner}>
          <WaInboxChatSelect allWaContacts={waContacts} />
          <WaInboxChatDisplay
            messages={messages}
            waContact={
              waContacts.find(
                (contact) => contact.id === contactId,
              ) as WaContact
            }
          />
        </Group>
      </div>
    </MantineProvider>
  );
}
