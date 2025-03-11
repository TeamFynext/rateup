import { useMemo, useRef } from "react";

import { Group, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconExclamationCircle,
  IconInfoCircle,
  IconSend,
} from "@tabler/icons-react";
import { create } from "zustand";

import useTranslations from "@/dictionaries/useTranslation";

import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useGetAssignedUserForContact,
  useSendNewWaMessage,
} from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { isInboxSessionExpired } from "../../../../../utils/whatsapp/inbox";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../../Button/RateupButtons";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";
import { PopoverEmojiPicker } from "../../../templates/Details/TextFormateToolBar";
import { AssignInbox } from "../chatdisplayHeader";
import WaInboxFooterMenu from "./footerMenu";
import classes from "./styles.module.css";

export default function WaInboxChatDisplayFooter({
  contact,
  isChatAssignedToMe,
}: {
  contact: ContactsWithLastMessage;
  isChatAssignedToMe: boolean;
}) {
  const inputRef = useRef(null);
  const { translations } = useTranslations();
  const sendnewWaMessage = useSendNewWaMessage(contact.id);
  const { addMessage, removeMessage } = useMessageStore();
  const form = useForm({
    initialValues: {
      type: "text",
      text: { body: "" },
    },
    validate: {
      text: (value) => {
        if (value.body.length === 0) {
          return translations["Message can't be empty"];
        }
      },
    },
  });
  function handleSendMessage(values: typeof form.values) {
    form.reset();
    addMessage(contact.id, {
      body: values.text.body,
      type: "text",
    });
    sendnewWaMessage.mutate(values, {
      onSuccess: () => {
        removeMessage(contact.id);
      },
    });
  }
  function insertEmoji(value: string) {
    const { selectionStart, selectionEnd } = inputRef.current;
    const text = form.values.text.body;
    const before = text.substring(0, selectionStart);
    const after = text.substring(selectionEnd);
    const updatedText = before + value + after;
    form.setValues({
      text: { ...form.values.text, body: updatedText },
    });
    setTimeout(() => {
      const newPosition = before.length + value.length;
      inputRef.current.selectionStart = newPosition;
      inputRef.current.selectionEnd = newPosition;
    }, 0);
  }

  const isSessionExpired = isInboxSessionExpired(
    contact?.lastReceivedMessageTimeStamp,
  );
  return (
    <Stack gap={0}>
      {!isChatAssignedToMe && (
        <Group
          bg={"black"}
          justify="center"
          c={"white"}
          color="white"
          gap={2}
          py={2}
        >
          <IconExclamationCircle size={"1rem"} />
          <Text size="xs">This chat is not assigned to you</Text>
        </Group>
      )}
      <div className={classes.wrapper}>
        <WaInboxFooterMenu
          sessionExpired={isSessionExpired}
          contact={contact}
          disabled={!isChatAssignedToMe}
        />
        <form
          onSubmit={form.onSubmit((values) => handleSendMessage(values))}
          className={classes.form}
        >
          <ContainedTextField
            ref={inputRef}
            disabled={isSessionExpired || !isChatAssignedToMe}
            leftSection={<PopoverEmojiPicker onEmojiClick={insertEmoji} />}
            flex={1}
            value={form.values.text.body}
            onChange={(e) =>
              form.setValues({
                text: { ...form.values.text, body: e.target.value },
              })
            }
          />
          <RateupButtonPrimary
            disabled={isSessionExpired || !isChatAssignedToMe}
            type={"submit"}
            title={translations["Send"]}
            rightIcon={<IconSend />}
          />
        </form>
      </div>
    </Stack>
  );
}

export const WaInboxAssignUserFooter = ({ contactId, user }) => {
  const assignMut = useAssignInboxToUer();
  const [openedAssign, { open: openAssign, close: closeAssign }] =
    useDisclosure(false);

  function handleAssignToMe() {
    assignMut.mutate({
      contactId,
      assignedUserIds: [user.userId],
      teamId: user.teams[0],
    });
  }

  return (
    <Stack gap={"xs"} pb={"xs"}>
      <Group
        bg={"black"}
        justify="center"
        c={"white"}
        color="white"
        gap={2}
        py={2}
      >
        <IconExclamationCircle size={"1rem"} />
        <Text size="xs">Please Assign to start the chat</Text>
      </Group>
      <Group justify={"center"} gap={"xs"}>
        <RateupButtonSecondary
          title="Assign To Me"
          onClick={handleAssignToMe}
          size="xs"
          radius={"md"}
        />
        <RateupButtonPrimary
          title="Assign To Staff"
          onClick={openAssign}
          size="xs"
          radius={"md"}
        />
      </Group>
      <AssignInbox
        contactId={contactId}
        opened={openedAssign}
        close={closeAssign}
      />
    </Stack>
  );
};

interface Message {
  id?: string;
  contactId: string;
  body: string;
  type: string;
  timestamp: number;
  isOutgoing: boolean;
}

interface MessageState {
  messages: Record<string, Message[]>;
  addMessage: (
    contactId: string,
    message: Omit<Message, "contactId" | "timestamp" | "isOutgoing">,
  ) => void;
  getMessages: (contactId: string) => Message[];
  removeMessage: (contactId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  addMessage: (contactId, message) =>
    set((state) => {
      const newMessage: Message = {
        ...message,
        contactId,
        timestamp: Date.now(),
        isOutgoing: true,
      };

      const currentContactMessages = state.messages[contactId] || [];

      return {
        messages: {
          ...state.messages,
          [contactId]: [...currentContactMessages, newMessage],
        },
      };
    }),
  getMessages: (contactId) => get().messages[contactId] || [],
  removeMessage: (contactId) =>
    set((state) => {
      return {
        messages: {
          ...state.messages,
          [contactId]: [],
        },
      };
    }),
}));
