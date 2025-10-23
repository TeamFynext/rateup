"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ActionIcon,
  Group,
  Menu,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconBrandInstagram,
  IconBrandWhatsappFilled,
  IconWebhook,
} from "@tabler/icons-react";
import {
  Ban,
  BellOff,
  Bot,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  InstagramIcon,
  MessageCircle,
  MoreVertical,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  MessagePlatform,
  SubscriptionFeaturePathName,
  WaMessageAssignStatus,
} from "@/types/enums";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/inbox/ChatDisplayContext";
import useContactStore, {
  ContactWithUpdatedAt,
  useContactsStore,
} from "@/app/dashboard/inbox/store";
import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { useGetChatbotDetails } from "@/backend/chatbot/chatbot.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useBlockWhatsAppUser,
  useGetAssignedUserForContact,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import CopyIcon from "@/components/Button/CopyIcon";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { CreateTicketCard } from "@/components/Tickets/CreateTicketModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useChatbotStore } from "@/store/chatbot.store";
import { TicketType } from "@/utils/enums/ticket";
import { hasFeature } from "@/utils/subscription/subscription";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox";

import { getSoucePlatformIconAndColor } from "../../util";
import AssignUser from "./AssignUser";
import WaInboxCountdownTimer from "./countDown";
import classes from "./styles.module.css";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactWithUpdatedAt;
  smallScreen: boolean;
  waSettings: any;
}
export default function WaInboxChatDisplayHeader({
  contact,
  smallScreen,
  waSettings,
}: WaInboxChatDisplayHeaderProps) {
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const editContactMutation = useEditContactMutation(null);
  const { setSelectedContact } = useContactsStore();
  const isMobile = useMediaQuery("(max-width: 1200px)");
  const { selectedChatbotId } = useChatbotStore();

  const { data: chatbot } = useGetChatbotDetails(selectedChatbotId);
  const { data: subscription } = useSubscription();

  const hasAIFeature = useMemo(
    () => hasFeature(subscription, SubscriptionFeaturePathName.AI),
    [subscription],
  );

  function handleAiWaChat(checked) {
    editContactMutation.mutate(
      { contactId: contact.id, data: { aiWaChat: checked } },
      {
        onSuccess: () => {
          setSelectedContact({ ...contact, aiWaChat: checked });
        },
      },
    );
  }

  const platform =
    contact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;
  const isInsta = platform === MessagePlatform.INSTAGRAM;
  let leftSectionIcon: React.ReactNode;

  switch (platform) {
    case MessagePlatform.INSTAGRAM:
      leftSectionIcon = <InstagramIcon size={13} />;
      break;
    case MessagePlatform.WEBCHAT:
      leftSectionIcon = <IconWebhook size={13} color="#25D366" />;
      break;
    case MessagePlatform.WHATSAPP:
    default:
      leftSectionIcon = <IconBrandWhatsappFilled size={13} color="#25D366" />;
      break;
  }

  const isSessionExpired = isInboxSessionExpired(
    contact?.lastReceivedMessageTimeStamp,
  );

  const sourcePlatform = getSoucePlatformIconAndColor(platform);
  if (!contact) return null;
  return (
    <div className="p-3 border-b bg-card flex-shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <div className="relative flex-shrink-0">
            <CreativeAvatar
              name={contact?.name || contact?.whatsappUserName || ""}
              size="md"
              isOnline={!isSessionExpired}
              showOnlineStatus={!isSessionExpired}
              onlineStatusPosition="topLeft"
              showRing={true}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 shadow-sm ${
                sourcePlatform?.bgColor
              }`}
            >
              {sourcePlatform?.icon}
            </div>
          </div>
          <div className="min-w-0 flex-shrink">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5">
                <h3 className="truncate">
                  {contact.name ?? contact.whatsappUserName}
                </h3>
                {!contact.consent && (
                  <CustomTooltip
                    side="bottom"
                    trigger={
                      <Badge
                        className="w-full h-4.5 text-[10px] text-red-600 bg-red-100"
                        variant={"secondary"}
                      >
                        <BellOff /> DND
                      </Badge>
                    }
                    content={
                      <span>
                        This contact has not consented to receive template
                        messages.
                      </span>
                    }
                  />
                )}
              </div>
              <LifecycleSelector value={contact.lifecycleId} id={contact.id} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAIFeature &&
            chatbot?.enableWaChat &&
            chatbot?.enableAllWaChat && (
              <Popover>
                <PopoverTrigger
                  asChild
                  className="hover:bg-accent p-1 rounded-md"
                >
                  <Bot
                    className={`h-7 w-7 ${contact.aiWaChat ? "text-blue-600" : "text-gray-200"} cursor-pointer`}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-40 break-words">
                  <p className="text-sm text-muted-foreground mb-2">
                    Enable/Disable AI response for this contact
                  </p>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={contact.aiWaChat}
                      onCheckedChange={handleAiWaChat}
                      id="ai-chat-switch"
                    />
                    <Label htmlFor="ai-chat-switchh" className="text-sm">
                      AI Chat
                    </Label>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          <AssignUser contactId={contact?.id} />
          <WaInboxCountdownTimer
            timeStamp={contact?.lastReceivedMessageTimeStamp}
          />
          <ChatHeaderMenu contact={contact} />
        </div>
      </div>
    </div>
  );
}

const ChatHeaderMenu = ({ contact }) => {
  const editContactMutation = useEditContactMutation(null);
  const { updateContactById, setSelectedContact } = useContactsStore();
  const [
    openedCreateTicket,
    { open: openCreateTicket, close: closeCreateTicket },
  ] = useDisclosure(false);
  const { data: subscription } = useSubscription();
  const [openedConfirmation, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const blockmut = useBlockWhatsAppUser();
  const hasTicketFeature = useMemo(
    () => hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    [subscription],
  );
  function handleBlock() {
    blockmut.mutate(
      { phoneNumbersList: [contact.phone] },
      {
        onSuccess: () => {
          setSelectedContact({
            ...contact,
            blockedOnWhatsApp: true,
          });
        },
      },
    );
  }
  function handleCloseChat() {
    editContactMutation.mutate(
      {
        contactId: contact.id,
        data: { waMessageAssignStatus: WaMessageAssignStatus.CLOSED },
      },
      {
        onSuccess: () => {
          updateContactById(contact.id, (existing) => ({
            ...existing,
            waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
            assignedUsers: [],
          }));
        },
      },
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleCloseChat}
          disabled={
            editContactMutation.isPending ||
            contact?.waMessageAssignStatus === WaMessageAssignStatus.CLOSED
          }
        >
          <CheckCheck className="w-4 h-4 mr-2" />
          Mark as Closed
        </DropdownMenuItem>

        {hasTicketFeature && (
          <DropdownMenuItem onClick={openCreateTicket}>
            <Ticket className="w-4 h-4 mr-2" />
            Create Ticket
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {!isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp) &&
          !contact?.blockedOnWhatsApp && (
            <DropdownMenuItem
              onClick={openConfirm}
              className="text-destructive"
            >
              <Ban className="w-4 h-4 mr-2 text-destructive" />
              Block contact
            </DropdownMenuItem>
          )}
      </DropdownMenuContent>
      <ConfirmationModal
        onClose={closeConfirm}
        headerTitle={`Block ${contact?.name ?? contact?.phone}`}
        confirmLabel="Block"
        opened={openedConfirmation}
        onConfirm={handleBlock}
        closeLabel="Cancel"
        deleteQuotion="The blocked user cannot message you and you cannot message the user"
        forDeleteFunctionality
        headerLabel="Are you sure to block this user?"
      />
      <CreateTicketCard
        close={closeCreateTicket}
        opened={openedCreateTicket}
        type={TicketType.CUSTOM}
        hasTicketFeature={hasTicketFeature}
      />
    </DropdownMenu>
  );
};

export const AssignInboxContent = ({
  form,
  memberChoice,
  setMemberChoice,
  isLoading,
  members,
}) => {
  return (
    <Stack>
      <TeamSelector label="Select Team" {...form.getInputProps("teamId")} />
      <RadioGroup value={memberChoice} onChange={setMemberChoice}>
        <Group>
          <Radio value={"all"} label={"All Members"} />
          <Radio value={"manual"} label={"Select Manually"} />
        </Group>
      </RadioGroup>
      {memberChoice === "manual" && (
        <Skeleton visible={isLoading}>
          <ContainedMultiSelect
            data={members}
            styles={{
              label: {
                color:
                  "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))",
                fontSize: 12,
              },
            }}
            {...form.getInputProps("assignedUserIds")}
            label={"Select Members"}
            placeholder="click to select"
            searchable
          />
        </Skeleton>
      )}
    </Stack>
  );
};
