"use client";

import { useEffect, useRef, useState } from "react";

import { Flex, Group, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconExclamationCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { MessageSquare, Send, StickyNote } from "lucide-react";
import { useTranslations } from "next-intl";
import { create } from "zustand";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import useContactStore, {
  ContactWithUpdatedAt,
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { useVoiceRecordStore } from "@/components/input/VoiceRecorder";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import WaTextEditor, {
  parseToWhatsAppFormat,
} from "@/components/RichTextEditor/waTextEditor";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, useUser } from "@/context/UserContext";
import { WaMessageClosedStatus } from "@/utils/constants";
import { formatDateWithRelativeTime } from "@/utils/dateTime";
import { deleteUploadedFiles } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

import {
  useAssignInboxToUer,
  useCreatePrivateMessage,
  useSendNewWaMessage,
  useUnBlockWhatsAppUser,
} from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import {
  isInboxSessionExpired,
  returnMessageContentBasedOnParsedMessage,
} from "../../../../../utils/whatsapp/inbox";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { usePhoneIdStore } from "../../chatselect/accountSelectorStore";
import { generateInternalMessageId } from "../../util";
import AssignUser from "../chatdisplayHeader/AssignUser";
import WaInboxFooterMenu from "./footerMenu";
import classes from "./styles.module.css";

export default function WaInboxChatDisplayFooter({
  contact,
}: Readonly<{
  contact: ContactWithUpdatedAt;
}>) {
  const [activeTab, setActiveTab] = useState<"message" | "private">("message");
  const inputRef = useRef(null);
  const submiRef = useRef(null);
  const translations = useTranslations();
  const { whatsappSettingsPhoneId, updatePhoneId } = usePhoneIdStore();
  const platform =
    contact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;
  const sendnewWaMessage = useSendNewWaMessage(
    contact.id,
    whatsappSettingsPhoneId,
    platform as MessagePlatform,
  );
  const createPrivateMessage = useCreatePrivateMessage(contact.id);
  const { addMessage, removeMessage } = useTemperoryMessageStore();
  const { media, resetMedia } = useMediaStore();
  const { isRecording, audioUrl, setAudioUrl } = useVoiceRecordStore();
  const { body, setBody, resetBody } = useMessageBodyStore();
  const { updateContactById } = useContactsStore();
  const messagesStore = useMessagesStore();
  const { user } = useUser();

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
  function handleSendPrivateMessage() {
    if (form.validate().hasErrors) return;
    if (!whatsappSettingsPhoneId && platform !== MessagePlatform.WEBCHAT) {
      showErrorToast("Select a account to send the message");
      return;
    }
    const values = { ...form.values };
    form.reset();
    resetBody();
    resetMedia();
    setAudioUrl(null);
    const id = generateInternalMessageId();
    const newMessage = {
      id: id,
      contactId: contact.id,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        privateNote: {
          text: {
            body: parseToWhatsAppFormat(values.text.body),
          },
          mentionedUser: [],
          triggeredByUser: {
            id: user.userId,
            name: user.userName,
          },
        },
        exchangeProcess: "privateNote",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user.userId,
      sender: {
        name: user.userName,
        profilePhoto: user?.profilePhoto,
      },
      stats: {
        read: "",
        sent: "",
        failed: "",
        delivered: "",
      },
      messageId: id,
    };
    messagesStore.addMessage(`${contact.id}_all`, newMessage as any);
    messagesStore.addMessage(`${contact.id}_internal`, newMessage as any);

    createPrivateMessage.mutate(
      {
        data: {
          ...values,
          messageId: id,
        },
      },
      {
        onError: () => {
          messagesStore.removeMessage(`${contact.id}_all`, id);
          messagesStore.removeMessage(`${contact.id}_internal`, id);
        },
      },
    );
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

  const SendMessageComponent = () => {
    return (
      <CustomTooltip
        trigger={
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 h-[60px] px-6"
            onClick={handleSendMessage}
            disabled={
              isSessionExpired ||
              isRecording ||
              (!media.length && !form.isValid("text"))
            }
          >
            <Send className="w-4 h-4" />
          </Button>
        }
        content={<span>{translations("Send")}</span>}
      />
    );
  };
  const SendPrivateMessageComponent = () => {
    return (
      <CustomTooltip
        trigger={
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 h-[60px] px-6"
            onClick={handleSendPrivateMessage}
            disabled={
              isSessionExpired ||
              isRecording ||
              (!media.length && !form.isValid("text"))
            }
          >
            <Send className="w-4 h-4" />
          </Button>
        }
        content={<span>{translations("Send")}</span>}
      />
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
    <div>
      <div className="flex flex-col gap-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="p-2 bg-white dark:bg-transparent"
        >
          <TabsList>
            <TabsList className="bg-muted p-1 rounded-lg">
              <TabsTrigger
                value="message"
                className="
      flex items-center
      data-[state=active]:bg-primary
      data-[state=active]:text-white
    "
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Message
              </TabsTrigger>

              <TabsTrigger
                value="private"
                className="
      flex items-center
      data-[state=active]:bg-amber-600
      data-[state=active]:text-white
    "
              >
                <StickyNote className="w-3.5 h-3.5 mr-1.5" />
                Private Note
              </TabsTrigger>
            </TabsList>
          </TabsList>

          <TabsContent value="message">
            <WaTextEditor
              handleInputChange={(value) => {
                setBody({ ...body, text: { ...body.text, body: value } });
              }}
              content={body.text.body}
              mih={100}
              flex={1}
              inbox={true}
              customEnter={() => submiRef.current()}
              editable={
                !isSessionExpired &&
                !isRecording &&
                !audioUrl &&
                body.type === "text"
              }
              placeholder="Type a message...Type / for quick replies"
              sendMessageButton={<SendMessageComponent />}
              border={true}
            />
          </TabsContent>

          <TabsContent value="private">
            <WaTextEditor
              handleInputChange={(value) => {
                setBody({ ...body, text: { ...body.text, body: value } });
              }}
              content={body.text.body}
              mih={100}
              flex={1}
              privateMessage={true}
              editable={true}
              placeholder="Add a private note"
              sendMessageButton={<SendPrivateMessageComponent />}
              border={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export const WaInboxAssignUserFooter = ({
  contact,
  user,
}: {
  contact: ContactWithUpdatedAt;
  user: User;
}) => {
  const {
    id: contactId,
    waMessageAssignStatus,
    closedAt,
    closedUser,
  } = contact ?? {};
  const { filterData } = useContactStore();
  const messagesStore = useMessagesStore();
  const assignMut = useAssignInboxToUer(contactId, filterData);
  const { updateContactById } = useContactsStore();
  const qc = useQueryClient();

  function handleAssignToMe() {
    if (!user) {
      return showErrorToast("failed!try again");
    }
    let message = `Chat assigned to ${user.userName}`;
    const id = generateInternalMessageId();
    const newMessage = {
      id: id,
      contactId: contactId,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: {
            body: message,
          },
          assignedUsers: [],
          assignStatus: WaMessageAssignStatus.ASSIGNED,
          triggeredByUser: {
            id: user.userId,
            name: user.userName,
          },
        },
        exchangeProcess: "internal",
      },
      sourcePlatform: "INTERNAL",
      sourceIdentifier: null,
      sendBy: user.userId,
      sender: {
        name: user.userName,
        profilePhoto: user?.profilePhoto,
      },
      stats: {
        read: "",
        sent: "",
        failed: "",
        delivered: "",
      },
      messageId: id,
    };
    messagesStore.addMessage(`${contactId}_all`, newMessage as any);
    messagesStore.addMessage(`${contactId}_internal`, newMessage as any);
    assignMut.mutate(
      {
        messageId: id,
        contactId,
        assignees: [
          {
            userId: user.userId,
            teamId: user.teams?.[0],
          },
        ],
      },
      {
        onSuccess: () => {
          updateContactById(contactId, (contact) => ({
            ...contact,
            waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
            assignedUsers: [
              {
                id: user.userId,
                name: user?.userName,
              },
            ],
          }));
          qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
        },
        onError: () => {
          messagesStore.removeMessage(`${contactId}_all`, id);
          messagesStore.removeMessage(`${contactId}_internal`, id);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-2 bg-background">
      <div className="bg-black flex justify-center items-center text-white gap-0.5 py-1">
        <IconExclamationCircle size={"1rem"} />
        {WaMessageClosedStatus.includes(waMessageAssignStatus) && (
          <>
            <span className="text-xs">This chat has been closed</span>
            {closedAt && (
              <span className="text-xs lowercase">
                by {closedUser.name} at{" "}
                {formatDateWithRelativeTime(contact.closedAt)}.
              </span>
            )}
          </>
        )}
        <span className="text-xs">Please Assign to start the chat.</span>
      </div>
      <div className="flex justify-center items-center gap-2">
        <Button variant="outline" onClick={handleAssignToMe} size="sm">
          <div className="text-sm">Assign To Me</div>
        </Button>
        <AssignUser contactId={contactId} variant="default" />
      </div>
    </div>
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
    <Stack gap={"xs"} pb={"xs"} className="bg-background">
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
