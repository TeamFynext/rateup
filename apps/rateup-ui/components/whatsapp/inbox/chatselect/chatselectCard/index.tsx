"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import {
  AlertCircle,
  Archive,
  BadgeCheck,
  CheckCircle,
  CheckCircle2,
  Circle,
  CircleCheckBig,
  CircleHelp,
  CircleSlash,
  UserX,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/inbox/ChatDisplayContext";
import { useContactsStore } from "@/app/dashboard/inbox/store";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Badge } from "@/components/ui/badge";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { WaMessageClosedStatus } from "@/utils/constants";
import {
  formatDateWithRelativeTime,
  formatToRelativeTime,
} from "@/utils/dateTime";
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

  const closed = getContactClosedIcon(contact?.waMessageAssignStatus);
  const Icon = closed?.icon;

  return (
    <div
      key={contact?.id}
      onClick={() => {
        setSelectedContact(contact);
      }}
      className={`p-3 cursor-pointer transition-all hover:bg-accent/50 ${selectedContact?.id === contact?.id && "bg-accent border-l-2 border-b-1 border-blue-600"} ${contact?.unReadMessageCount > 0 && "bg-blue-50/30"}`}
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
            size="lg"
            showOnlineStatus={true}
            isOnline={
              !isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)
            }
            onlineStatusPosition="topLeft"
            src={contact?.profilePic}
            showRing={true}
            variant="light-blue"
            ringClassName="ring-white"
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ${
              platform === MessagePlatform.WHATSAPP
                ? "bg-green-600 border"
                : platform === MessagePlatform.INSTAGRAM
                  ? "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 border"
                  : "bg-blue-600 border"
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
              {/* {contact?.lastReceivedMessageTimeStamp &&
                dayjs().diff(contact.lastReceivedMessageTimeStamp, "hour") <
                  24 && <Badge className="h-3 text-[10px] p-2">New</Badge>} */}
              {lifecycleInfo && (
                <Badge variant="secondary" className={`text-[10px] h-5 px-1.5`}>
                  {lifecycleInfo?.emoji + " " + lifecycleInfo?.name}
                </Badge>
              )}
            </div>

            {WaMessageClosedStatus.includes(contact?.waMessageAssignStatus) ? (
              <div className="flex ">
                <CustomTooltip
                  trigger={
                    <Icon className={`text-[10px] h-4 ${closed.color}`} />
                  }
                  content={
                    <span>
                      {contact.closedAt ? (
                        <span>{`Marked as ${contact?.waMessageAssignStatus} by ${contact.closedUser?.name} at ${formatDateWithRelativeTime(contact.closedAt)}`}</span>
                      ) : (
                        translations("Closed")
                      )}
                    </span>
                  }
                />
                {contact.closedAt && (
                  <span className="text-xs text-muted-foreground">
                    {formatToRelativeTime(contact.closedAt)}
                  </span>
                )}
              </div>
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
                <CustomTooltip
                  trigger={
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
                  }
                  content={
                    <div>
                      <p className="mb-1">Assigned Staff:</p>
                      <div className="flex gap-1 flex-wrap max-w-lg py-2">
                        {contact?.assignedUsers.map((user) => (
                          <Badge key={user?.id} className="h-4 p-2 text-[10px]">
                            {user?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  }
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function getContactClosedIcon(status) {
  switch (status) {
    case WaMessageAssignStatus.CLOSED:
      return {
        icon: Archive,
        color: "text-blue-500 dark:text-blue-600",
      };
    case WaMessageAssignStatus.RESOLVED:
      return {
        icon: CheckCircle,
        color: "text-green-500 dark:text-green-600",
      };
      break;
    case WaMessageAssignStatus.UNRESOLVED:
      return {
        icon: Circle,
        color: "text-orange-500 dark:text-orange-600",
      };
    case WaMessageAssignStatus.SPAM:
      return {
        icon: AlertCircle,
        color: "text-red-500 dark:text-red-600",
      };
  }
}

const ContactClosedIcon = ({ status, className = "" }) => {
  let closedIcon = null;
  switch (status) {
    case WaMessageAssignStatus.CLOSED:
      closedIcon = (
        <CircleCheckBig
          className={`${className} text-blue-500 dark:text-blue-600`}
        />
      );
      break;
    case WaMessageAssignStatus.RESOLVED:
      closedIcon = (
        <CheckCircle2
          className={`${className} text-green-500 dark:text-green-600`}
        />
      );
      break;
    case WaMessageAssignStatus.UNRESOLVED:
      closedIcon = (
        <CircleHelp
          className={`${className} text-orange-500 dark:text-orange-600`}
        />
      );
      break;
    case WaMessageAssignStatus.SPAM:
      closedIcon = (
        <CircleSlash
          className={`${className} text-red-500 dark:text-red-600`}
        />
      );
      break;
  }
  return closedIcon;
};
