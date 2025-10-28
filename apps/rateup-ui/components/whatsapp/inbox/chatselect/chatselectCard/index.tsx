"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import dayjs from "dayjs";

import { MessagePlatform } from "@/types/enums";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/inbox/ChatDisplayContext";
import { useContactsStore } from "@/app/dashboard/inbox/store";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { getStringColor } from "@/components/ui/utils";
import {
  isInboxSessionExpired,
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox";

import { getSoucePlatformIconAndColor } from "../../util";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
  waSettings: WaSettings;
  lifeCycleLabels: Array<{
    id: string;
    name: string;
    category: string;
    emoji: string;
  }>;
}
export default function WaInboxChatSelectCard({
  contact,
  lifeCycleLabels,
}: Readonly<WaInboxChatSelectCardProps>) {
  const params = useSearchParams();
  const lastMessage = contact?.lastMessage;

  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  let tab = params.get("tab") ?? "New";

  const { setSelectedContact, selectedContact } = useContactsStore();

  const platform = lastMessage?.sourcePlatform;
  const lifecycleInfo = useMemo(() => {
    const label = lifeCycleLabels?.find(
      (label) => label.id === contact?.lifecycleId,
    );
    return label;
  }, [contact?.lifecycleId, lifeCycleLabels]);

  function getBorderColor() {
    if (selectedContact?.id === contact?.id) {
      switch (platform) {
        case MessagePlatform.WHATSAPP:
          return "bg-accent border-l-2 border-b-1 border-green-600";
        case MessagePlatform.INSTAGRAM:
          return "bg-accent border-l-2 border-b-1 border-pink-500";
        case MessagePlatform.WEBCHAT:
          return "bg-accent border-l-2 border-b-1 border-blue-600";
        default:
          return "";
      }
    }
    return "";
  }

  function getBackgroundColor() {
    if (contact?.unReadMessageCount > 0) {
      switch (platform) {
        case MessagePlatform.WHATSAPP:
          return "bg-green-50/30";
        case MessagePlatform.INSTAGRAM:
          return "bg-pink-50/30";
        case MessagePlatform.WEBCHAT:
          return "bg-blue-50/30";
        default:
          return "";
      }
    }
    return "";
  }

  return (
    <div
      key={contact?.id}
      onClick={() => {
        setSelectedContact(contact);
      }}
      className={`p-3 cursor-pointer transition-all hover:bg-accent/50 ${getBorderColor()} ${getBackgroundColor()}`}
    >
      <div className="flex items-start space-x-2">
        <div className="relative flex-shrink-0">
          <CreativeAvatar
            name={
              contact?.name ||
              contact?.whatsappUserName ||
              contact?.phone ||
              contact?.igsId ||
              "Unknown"
            }
            size="md"
            className={
              contact?.unReadMessageCount > 0
                ? platform === MessagePlatform.WHATSAPP
                  ? "ring-2 ring-green-600 rounded-full"
                  : platform === MessagePlatform.INSTAGRAM
                    ? "ring-2 ring-pink-500 rounded-full"
                    : "ring-2 ring-blue-500 rounded-full"
                : ""
            }
            showOnlineStatus={
              !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)
            }
            isOnline={
              !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)
            }
            onlineStatusPosition="topLeft"
            src={contact?.profilePic}
            showRing={true}
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ${
              platform === MessagePlatform.WHATSAPP
                ? "bg-green-600"
                : platform === MessagePlatform.INSTAGRAM
                  ? "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500"
                  : "bg-blue-600"
            }`}
          >
            {getSoucePlatformIconAndColor(platform)?.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-0.5">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <p
                className={`truncate text-sm ${contact?.unReadMessageCount > 0 ? "font-semibold" : "font-medium"}`}
              >
                {contact?.name ||
                  contact?.whatsappUserName ||
                  contact?.phone ||
                  contact?.igsId ||
                  "Unknown"}
              </p>
              {contact?.isIgVerifiedUser && (
                <IconRosetteDiscountCheckFilled size={12} color="blue" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {contact?.lastMessage &&
                  dayjs.utc(contact?.lastMessage?.waCreatedAt).fromNow()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <p
              className={`text-xs flex-1 ${contact?.unReadMessageCount > 0 ? "text-black dark:text-white font-medium" : "text-muted-foreground"} break-all line-clamp-1`}
            >
              {lastMessage &&
                returnMessageContentBasedOnParsedMessage(
                  parseWaMessage(lastMessage),
                  lastMessage.messageBody.exchangeProcess,
                )}
            </p>
            {contact?.unReadMessageCount > 0 && (
              <Badge
                className={`text-white text-[10px] h-4 min-w-[20px] px-1.5 rounded-full flex-shrink-0 ${
                  platform === MessagePlatform.WHATSAPP
                    ? "bg-green-600"
                    : platform === MessagePlatform.INSTAGRAM
                      ? "bg-pink-500"
                      : "bg-blue-600"
                }`}
              >
                {contact.unReadMessageCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 h-5">
            <div className="flex items-center gap-1 flex-wrap">
              {contact?.lastReceivedMessageTimeStamp &&
                dayjs().diff(contact.lastReceivedMessageTimeStamp, "hour") <
                  24 && <Badge className="h-3 text-[10px] p-2">New</Badge>}
              {lifecycleInfo && (
                <Badge variant="secondary" className={`text-[10px] h-5 px-1.5`}>
                  {lifecycleInfo?.emoji + " " + lifecycleInfo?.name}
                </Badge>
              )}
            </div>

            {contact?.assignedUsers?.length > 0 && (
              <CustomTooltip
                trigger={
                  <div className="flex -space-x-1 relative">
                    {contact.assignedUsers.slice(0, 1).map((a) => {
                      return (
                        <div
                          key={a?.id}
                          className="relative flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                        >
                          <Avatar className="w-5 h-5">
                            <AvatarFallback
                              className={`${getStringColor(a?.name).bg} text-white text-[10px]`}
                            >
                              {a?.name
                                ?.split(" ")
                                .map((s) => s[0]?.toUpperCase())
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      );
                    })}
                    {contact.assignedUsers.length > 1 && (
                      <div className="w-5 h-5 rounded-full bg-muted text-[10px] flex items-center justify-center border border-white">
                        +{contact.assignedUsers.length - 1}
                      </div>
                    )}
                  </div>
                }
                content={
                  <div>
                    <p>Assigned Users:</p>
                    <div className="flex flex-col gap-2 mt-1">
                      {contact.assignedUsers.map((user) => (
                        <div
                          className="flex items-center gap-0.5"
                          key={user.id}
                        >
                          <CreativeAvatar name={user?.name} size="xs" />
                          <span
                            key={user.id}
                            className="p-1 rounded-md text-xs"
                          >
                            {user.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                }
                side="bottom"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
