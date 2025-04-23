import { useEffect, useRef } from "react";

import { Flex, Group, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconExclamationCircle, IconSend } from "@tabler/icons-react";
import { create } from "zustand";

import { VoiceRecorder } from "@/components/RichTextEditor/InsertInboxMedia/RecordVoiceController";
import WaTextEditor, {
  parseJsonToReact,
  parseToWhatsAppFormat,
} from "@/components/RichTextEditor/waTextEditor";
import useTranslations from "@/dictionaries/useTranslation";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { deleteUploadedFiles } from "@/utils/file-upload/upload";

import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useSendNewWaMessage,
} from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { isInboxSessionExpired } from "../../../../../utils/whatsapp/inbox";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../../Button/RateupButtons";
import { AssignInbox } from "../chatdisplayHeader";
import WaInboxFooterMenu from "./footerMenu";
import classes from "./styles.module.css";

export default function WaInboxChatDisplayFooter({
  contact,
}: {
  contact: ContactsWithLastMessage;
}) {
  const inputRef = useRef(null);
  const submiRef = useRef(null);
  const { translations } = useTranslations();
  const sendnewWaMessage = useSendNewWaMessage(contact.id);
  const { addMessage, removeMessage } = useMessageStore();
  const { media, resetMedia } = useMediaStore();
  const form = useForm({
    initialValues: {
      type: "text",
      text: { body: "" },
      media: media,
    },
    validate: {
      text: (value) => {
        if (value.body.length === 0) {
          return translations["Message can't be empty"];
        }
      },
    },
  });
  function handleSendMessage() {
    const values = { ...form.values };
    form.reset();
    const trimmedBody =
      values.text.body !== ""
        ? parseToWhatsAppFormat(values.text.body).trim()
        : "";
    if (!trimmedBody.length && !values.media.length) return;
    if (!trimmedBody.length && values.media.length) values.type = "media";
    addMessage(contact.id, {
      body: {
        text: values.text.body,
        ...(values.media.length
          ? {
              url: values.media[0].url,
              urlType: values.media[0].type,
              filename: values.media[0].name,
            }
          : {}),
      },
      type: "text",
    });
    resetMedia();
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
  submiRef.current = () => {
    if (isSessionExpired) return;
    handleSendMessage();
  };

  useEffect(() => {
    resetMedia();
  }, [contact]);

  useEffect(() => {
    if (media.length) {
      form.setFieldValue("media", media);
    }
  }, [media]);

  const SendMessageComponent = () => {
    return (
      <Group>
        <WaInboxFooterMenu
          sessionExpired={isSessionExpired}
          contact={contact}
        />
        <RateupButtonPrimary
          title={translations["Send"]}
          rightIcon={<IconSend />}
          onClick={handleSendMessage}
          disabled={isSessionExpired}
        />
        <VoiceRecorder />
      </Group>
    );
  };

  if (isSessionExpired) {
    return (
      <Flex className={classes.wrapper} justify="flex-start">
        <WaInboxFooterMenu
          sessionExpired={isSessionExpired}
          contact={contact}
        />
      </Flex>
    );
  }

  return (
    <Stack gap={0}>
      <div className={classes.wrapper}>
        <form className={classes.form}>
          <div ref={inputRef} style={{ display: "flex", flex: 1 }}>
            <WaTextEditor
              handleInputChange={(value) => {
                form.setValues({
                  text: { ...form.values.text, body: value },
                });
              }}
              content={form.values.text.body}
              mih={50}
              flex={1}
              inbox={true}
              customEnter={() => submiRef.current()}
              editable={!isSessionExpired}
              customHeaders={<SendMessageComponent />}
            />
          </div>
        </form>
      </div>
    </Stack>
  );
}

export const WaInboxAssignUserFooter = ({ contactId, user }) => {
  const { filterData } = useContactStore();
  const assignMut = useAssignInboxToUer(filterData);
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
  body: {
    text: string;
    url?: string;
    urlType?: string;
    filename?: string;
  };
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

type WaMedia = {
  type: string;
  url: string;
  name: string;
  key: string;
};

interface MediaStore {
  media: WaMedia[];
  addMedia: (value: WaMedia) => void;
  removeMedia: (key) => void;
  resetMedia: () => void;
  selectedMedia: WaMedia;
  setSelectedMedia: (value) => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
  media: [],
  addMedia: (value) => set((state) => ({ media: [...state.media, value] })),
  selectedMedia: null,
  setSelectedMedia: (value) => set(() => ({ selectedMedia: value })),
  removeMedia: async (key) => {
    await deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
    set((state) => {
      const medias = state.media.filter((m) => m.key !== key);
      return { media: medias };
    });
  },
  resetMedia: () => set(() => ({ media: [] })),
}));
