"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import { BadgeCheck, CircleCheckBig, UserX } from "lucide-react";
import { useTranslations } from "next-intl";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/inbox/ChatDisplayContext";
import { useContactsStore } from "@/app/dashboard/inbox/store";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { getStringColor } from "@/components/ui/utils";
import { formatToRelativeTime } from "@/utils/dateTime";
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
  const translations = useTranslations();
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
            showOnlineStatus={
              !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)
            }
            isOnline={
              !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)
            }
            onlineStatusPosition="topLeft"
            src={contact?.profilePic}
            showRing={true}
            platform={platform}
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
              <p className={`truncate text-sm`}>
                {contact?.name ||
                  contact?.whatsappUserName ||
                  contact?.phone ||
                  contact?.igsId ||
                  "Unknown"}
              </p>
              {contact?.isIgVerifiedUser && (
                <BadgeCheck size={12} color="blue" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {contact?.lastMessage &&
                  formatToRelativeTime(contact?.lastMessage?.waCreatedAt, true)}
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

            {contact?.waMessageAssignStatus === WaMessageAssignStatus.CLOSED ? (
              <CustomTooltip
                trigger={
                  <CircleCheckBig
                    className={`text-[10px] h-4 text-blue-500 dark:text-blue-600 rounded-2xl`}
                  />
                }
                content={<span>{translations("Closed")}</span>}
              />
            ) : contact?.waMessageAssignStatus ===
              WaMessageAssignStatus.UNASSIGNED ? (
              <CustomTooltip
                trigger={
                  <UserX
                    className={`text-[10px] h-4 text-gray-500 dark:text-gray-400 rounded-2xl`}
                  />
                }
                content={<span>{translations("UnAssigned")}</span>}
              />
            ) : (
              contact?.assignedUsers?.length > 0 && (
                <div className="flex space-x-1">
                  {contact?.assignedUsers?.slice(0, 2).map((a) => {
                    return (
                      <Badge
                        variant="outline"
                        key={a?.id}
                        className="border-blue-500 text-blue-500"
                      >
                        {a?.name}
                      </Badge>
                    );
                  })}
                  {contact?.assignedUsers.length > 2 && (
                    <div className="w-5 h-5 rounded-full bg-muted text-[10px] flex items-center justify-center border border-white">
                      +{contact?.assignedUsers?.length - 2}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
