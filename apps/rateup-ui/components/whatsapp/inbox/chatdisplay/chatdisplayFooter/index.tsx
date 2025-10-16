"use client";

import { useEffect, useRef } from "react";

import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconExclamationCircle, IconSend } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { create } from "zustand";

import { MessagePlatform } from "@/types/enums";
import useContactStore, {
  ContactWithUpdatedAt,
  useContactsStore,
} from "@/app/dashboard/inbox/store";
import { AccountSelector } from "@/components/input/AccountSelector";
import VoiceRecorder, {
  useVoiceRecordStore,
} from "@/components/input/VoiceRecorder";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import WaTextEditor, {
  parseToWhatsAppFormat,
} from "@/components/RichTextEditor/waTextEditor";
import { deleteUploadedFiles } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useSendNewWaMessage,
  useUnBlockWhatsAppUser,
} from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import {
  isInboxSessionExpired,
  returnMessageContentBasedOnParsedMessage,
} from "../../../../../utils/whatsapp/inbox";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../../Button/RateupButtons";
import { usePhoneIdStore } from "../../chatselect/accountSelectorStore";
import { AssignInbox } from "../chatdisplayHeader";
import WaInboxFooterMenu from "./footerMenu";
import classes from "./styles.module.css";

export default function WaInboxChatDisplayFooter({
  contact,
}: Readonly<{
  contact: ContactWithUpdatedAt;
}>) {
  const inputRef = useRef(null);
  const submiRef = useRef(null);
  const translations = useTranslations();
  const { whatsappSettingsPhoneId, updatePhoneId } = usePhoneIdStore();
  const platform = contact?.source?.toUpperCase() || MessagePlatform.WHATSAPP;
  const sendnewWaMessage = useSendNewWaMessage(
    contact.id,
    whatsappSettingsPhoneId,
    platform as MessagePlatform,
  );
  const { addMessage, removeMessage } = useTemperoryMessageStore();
  const { media, resetMedia } = useMediaStore();
  const { isRecording, audioUrl, setAudioUrl } = useVoiceRecordStore();
  const { body, setBody, resetBody } = useMessageBodyStore();
  const phone_number_id = contact?.metadata?.phone_number_id || "";
  const { updateContactById } = useContactsStore();
  const form = useForm({
    initialValues: {
      type: "text",
      text: { body: "" },
      media: media,
      contacts: {
        contactIds: [],
        groupIds: [],
      },
      location: null,
    },
    validate: {
      text: (value, values) => {
        if (
          values.type === "text" &&
          (value.body === "" ||
            parseToWhatsAppFormat(value.body).trim().length === 0)
        ) {
          return translations("Message can't be empty");
        }
      },
      media: (value, values) => {
        if (values.type === "media" && !value.length) {
          return "media required";
        }
      },
      contacts: (value, values) => {
        if (
          values.type === "contact" &&
          !value.contactIds.length &&
          !value.groupIds.length
        ) {
          return "contacts required";
        }
      },
    },
  });

  useEffect(() => {
    if (media.length) {
      let message = {
        media,
        type: "text",
      };
      if (
        body.text.body === "" ||
        parseToWhatsAppFormat(body.text.body).trim().length === 0
      ) {
        message.type = "media";
      }
      form.setValues({ ...body, ...message });
    } else {
      form.setValues({ ...body });
    }
  }, [body, media]);

  useEffect(() => {
    if (form.values.type === "location" && form.values.location) {
      handleSendMessage();
    }
  }, [form.values]);

  useEffect(() => {
    if (audioUrl) {
      setBody({
        ...body,
        media: [{ url: audioUrl, type: "audio", name: "voice-note" }],
        type: "media",
        text: {
          body: "",
        },
      });
    }
  }, [audioUrl]);
  function handleSendMessage() {
    if (form.validate().hasErrors) return;
    if (!whatsappSettingsPhoneId && platform !== MessagePlatform.WEBCHAT) {
      showErrorToast("Select a account to send the message");
      return;
    }
    const values = { ...form.values };
    form.reset();
    resetBody();
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
    setAudioUrl(null);
    sendnewWaMessage.mutate(
      { ...values },
      {
        onSuccess: () => {
          removeMessage(contact.id);
        },
      },
    );
    updateContactById(contact.id, (contact) => ({
      ...contact,
      lastMessage: {
        messageBody: {
          send:
            platform === MessagePlatform.INSTAGRAM
              ? {
                  recipient: {
                    id: contact.igsId,
                  },
                  message: {
                    ...(values.type === "text"
                      ? { text: parseToWhatsAppFormat(values.text.body) }
                      : values.type === "media"
                        ? {
                            attachment: {
                              type: values.media[values.media.length - 1].type,
                            },
                          }
                        : {}),
                  },
                }
              : {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: contact.phone,
                  type: "text",
                  text: {
                    body:
                      values.type === "text"
                        ? parseToWhatsAppFormat(values.text.body)
                        : values.type === "media"
                          ? returnMessageContentBasedOnParsedMessage(
                              {
                                messageType:
                                  values.media[media.length - 1].type,
                                messageContent: "",
                                timeStamp: dayjs().unix().toString(),
                              },
                              "send",
                            )
                          : "",
                  },
                },
          exchangeProcess: "send",
          receive: null,
        },
        waCreatedAt: new Date().toISOString(),
        sourceIdentifier: whatsappSettingsPhoneId,
        sourcePlatform: platform as MessagePlatform,
      },
    }));
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

  const isSessionExpired =
    platform !== MessagePlatform.WEBCHAT &&
    isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);
  submiRef.current = () => {
    if (isSessionExpired) return;
    handleSendMessage();
  };

  useEffect(() => {
    resetMedia();
  }, [contact]);

  useEffect(() => {
    if (!whatsappSettingsPhoneId && phone_number_id) {
      updatePhoneId(phone_number_id);
    }
    if (
      platform === MessagePlatform.INSTAGRAM &&
      whatsappSettingsPhoneId !== contact?.lastMessage?.sourceIdentifier
    ) {
      updatePhoneId(contact.lastMessage.sourceIdentifier);
    }
  }, [whatsappSettingsPhoneId, phone_number_id, updatePhoneId]);

  const AccountSelectComponent = () => {
    if (platform === MessagePlatform.WEBCHAT) return null;
    return (
      <Group>
        <AccountSelector
          onChange={(phoneId) => {
            updatePhoneId(phoneId);
          }}
          value={whatsappSettingsPhoneId}
          w={150}
          size="xs"
          styles={{
            input: {
              background: "var(--mantine-primary-color-light)",
              color: "var(--mantine-primary-color-filled)",
              borderRadius: "5px",
              fontWeight: "400",
            },
            label: {
              display: "none",
            },
          }}
          platform={platform as MessagePlatform}
          disabled={platform === MessagePlatform.INSTAGRAM}
        />
        {platform !== MessagePlatform.INSTAGRAM &&
          platform !== MessagePlatform.WEBCHAT && (
            <WaInboxFooterMenu
              sessionExpired={isSessionExpired}
              contact={contact}
            />
          )}
      </Group>
    );
  };
  const SendMessageComponent = () => {
    return (
      <Group gap={"xs"} flex={1} justify={"space-between"}>
        <Group>
          {platform !== MessagePlatform.WEBCHAT && <VoiceRecorder />}
          <Tooltip label={translations("Send")}>
            <Button
              rightSection={<IconSend size={16} />}
              size="xs"
              onClick={handleSendMessage}
              disabled={isSessionExpired || isRecording}
            >
              Send
            </Button>
          </Tooltip>
        </Group>
      </Group>
    );
  };

  if (isSessionExpired) {
    if (platform === MessagePlatform.INSTAGRAM) return null;
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
                setBody({ ...body, text: { ...body.text, body: value } });
              }}
              content={body.text.body}
              mih={50}
              flex={1}
              inbox={true}
              customEnter={() => submiRef.current()}
              editable={
                !isSessionExpired &&
                !isRecording &&
                !audioUrl &&
                body.type === "text"
              }
              placeholder="Type a message..."
              customHeaders={<SendMessageComponent />}
              otherHeaders={<AccountSelectComponent />}
            />
          </div>
        </form>
      </div>
    </Stack>
  );
}

export const WaInboxAssignUserFooter = ({ contactId, user }) => {
  const { filterData } = useContactStore();
  const assignMut = useAssignInboxToUer(contactId, filterData);
  const [openedAssign, { open: openAssign, close: closeAssign }] =
    useDisclosure(false);

  function handleAssignToMe() {
    if (!user) {
      return showErrorToast("failed!try again");
    }
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

export const WaInboxBlockedContactFooter = ({ contact }) => {
  const { filterData } = useContactStore();
  const { setSelectedContact } = useContactsStore();
  const [opened, { open, close }] = useDisclosure(false);
  const unblockMut = useUnBlockWhatsAppUser(filterData);
  function handleUnblock() {
    unblockMut.mutate(
      { phoneNumbersList: [contact.phone] },
      {
        onSuccess: () => {
          setSelectedContact({ ...contact, blockedOnWhatsApp: false });
        },
      },
    );
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
        <Text size="xs">This contact has been blocked by you.</Text>
      </Group>
      <Group justify={"center"} gap={"xs"}>
        <RateupButtonPrimary
          title="Unblock contact"
          onClick={open}
          size="xs"
          radius={"md"}
        />
      </Group>
      <ConfirmationModal
        confirmLabel="Unblock"
        headerLabel="Are you sure to unblock this contact?"
        headerTitle={`Unblock ${contact?.name ?? contact?.phone}`}
        onClose={close}
        onConfirm={handleUnblock}
        opened={opened}
        closeLabel="cancel"
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

export const useTemperoryMessageStore = create<MessageState>((set, get) => ({
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

const initialMessgabody = {
  type: "text",
  media: [],
  text: { body: "" },
  contacts: {
    contactIds: [],
    groupIds: [],
  },
  location: null,
};

export const useMessageBodyStore = create<{
  body: {
    type: string;
    media?: WaMedia[];
    text?: { body: string };
    contacts?: {
      contactIds: string[];
      groupIds: string[];
    };
    location?: {
      longitude: string;
      latitude: string;
      name?: string;
      address?: string;
    };
  };
  setBody: (value) => void;
  resetBody: () => void;
}>((set) => ({
  body: initialMessgabody,
  setBody: (value) => set({ body: value }),
  resetBody: () => set({ body: initialMessgabody }),
}));
