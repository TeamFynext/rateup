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
import { useEffect, useRef, useState } from "react";
import { WaGetMessagesBody } from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../../../backend/whatsapp/inbox/ws";
import { useUser } from "../../../../context/UserContext";

export default function WhatsAppInbox() {
  const [messages, setMessages] = useState([] as WaGetMessagesBody[]);
  const { user } = useUser();
  const connectionRef = useRef<WebSocket | null>(null);

  const searchParams = useSearchParams();
  let contactId = searchParams.get("contactId");
  const { data, isLoading, error } = useGetMessagesByContactId(
    contactId as string,
  );
  const {
    data: contactsWithLastMessage,
    isLoading: isContactsLoading,
    error: isContactsError,
  } = useContactsWithLastMessage();

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
      const contactId = new URLSearchParams(window.location.search).get(
        "contactId",
      );
      const newMessage: { contact: ContactsData; message: WaGetMessagesBody } =
        JSON.parse(event.data);
      if (newMessage.contact.id === contactId) {
        setMessages((prevMessages) => [...prevMessages, newMessage.message]);
      }
    };

    connectionRef.current.onclose = () => {
      console.log("Disconnected from websocket");
    };

    return () => {
      connectionRef.current?.close();
    };
  }, []);

  if (isLoading || isContactsLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  if (isContactsError) return <div>Error: {isContactsError.message}</div>;

  return (
    <MantineProvider theme={whatsappTheme}>
      <div className={classes.wrapper}>
        <Title>Inbox</Title>
        <Group className={classes.inner}>
          <WaInboxChatSelect contacts={contactsWithLastMessage} />
          <WaInboxChatDisplay messages={messages} contactId={contactId} />
        </Group>
      </div>
    </MantineProvider>
  );
}
