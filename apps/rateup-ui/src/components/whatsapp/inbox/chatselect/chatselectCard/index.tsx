import { AlertCircle, Archive, BadgeCheck, CheckCircle, Circle, UserX } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useSetIsChatDisplayOpen } from "@/components/dashboard/inbox/ChatDisplayContext.tsx";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import { WaMessageClosedStatus } from "@/utils/constants.ts";
import { formatDateWithRelativeTime, formatToRelativeTime } from "@/utils/dateTime.ts";
import {
  isInboxSessionExpired,
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox.ts";

import { getSoucePlatformIconAndColor } from "../../util.tsx";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
  waSettings: WaSettings;
  lifeCycleLabels: Array<{
    id: string;
    name: string;
    category: string;
    emoji: string;
  }>;
  isSelectionMode: boolean;
  selectedChats: string[];
  setSelectedChats: React.Dispatch<React.SetStateAction<string[]>>;
}
export default function WaInboxChatSelectCard({
  contact,
  lifeCycleLabels,
  isSelectionMode,
  selectedChats,
  setSelectedChats,
}: Readonly<WaInboxChatSelectCardProps>) {
  const lastMessage = contact?.lastMessage;
  const { t: translations } = useTranslation();
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();

  const { setSelectedContact, selectedContact } = useContactsStore();

  const platform = lastMessage?.sourcePlatform;
  const lifecycleInfo = useMemo(() => {
    const label = lifeCycleLabels?.find((label) => label.id === contact?.lifecycleId);
    return label;
  }, [contact?.lifecycleId, lifeCycleLabels]);

  const closed = getContactClosedIcon(contact?.waMessageAssignStatus);
  const Icon = closed?.icon;

  return (
    <div
      key={contact?.id}
      onClick={() => {
        if (isSelectionMode) {
          setSelectedChats((prev) =>
            prev.includes(contact.id)
              ? prev.filter((id) => id !== contact.id)
              : [...prev, contact.id],
          );
          return;
        }
        setSelectedContact(contact);
        setIsChatDisplayOpen(true);
      }}
      className={cn(
        "p-3 cursor-pointer transition-all hover:bg-primary/10 border-l-4",
        selectedContact?.id === contact?.id
          ? "bg-primary/5 border-primary"
          : contact?.unReadMessageCount > 0
            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-400"
            : "border-transparent",
      )}
    >
      <div className="flex items-start space-x-2">
        {isSelectionMode && (
          <Checkbox
            className="border border-muted-foreground shadow-sm"
            onClick={(e) => e.stopPropagation()}
            checked={selectedChats.includes(contact.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedChats((prev) => [...prev, contact.id]);
              } else {
                setSelectedChats((prev) => prev.filter((id) => id !== contact.id));
              }
            }}
          />
        )}
        <div className="relative shrink-0">
          <CreativeAvatar
            name={
              contact?.name ||
              contact?.whatsappUserName ||
              contact?.phone ||
              contact?.igsId ||
              contact?.psid ||
              "Unknown"
            }
            size="lg"
            showOnlineStatus={true}
            isOnline={!isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp)}
            onlineStatusPosition="topLeft"
            src={contact?.profilePic}
            showRing={true}
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ${
              platform === MessagePlatform.WHATSAPP
                ? "bg-green-600 border"
                : platform === MessagePlatform.INSTAGRAM
                  ? "bg-linear-to-br from-purple-600 via-pink-500 to-orange-500 border"
                  : platform === MessagePlatform.FACEBOOK
                    ? "bg-blue-400 border"
                    : "bg-blue-600 border"
            }`}
          >
            {getSoucePlatformIconAndColor(platform)?.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-0.5">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <p
                className={`truncate text-[13px] font-bold ${selectedContact?.id === contact?.id && "text-primary"}`}
              >
                {contact?.name ||
                  contact?.whatsappUserName ||
                  contact?.phone ||
                  contact?.igsId ||
                  contact?.psid ||
                  "Unknown"}
              </p>
              {contact?.isIgVerifiedUser && <BadgeCheck size={12} color="blue" />}
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
                className={`text-white text-[10px] h-4 min-w-[20px] px-1.5 rounded-full shrink-0 ${
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

          <div className="flex items-center justify-between gap-1 min-h-5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* {contact?.lastReceivedMessageTimeStamp &&
                dayjs().diff(contact.lastReceivedMessageTimeStamp, "hour") <
                  24 && <Badge className="h-3 text-[10px] p-2">New</Badge>} */}
              {lifecycleInfo && (
                <span className="inline-flex items-center gap-[3px] rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {lifecycleInfo?.emoji + " " + lifecycleInfo?.name}
                </span>
              )}

              {WaMessageClosedStatus.includes(contact?.waMessageAssignStatus) ? (
                <div className="flex ">
                  <CustomTooltip
                    trigger={<Icon className={`text-[10px] h-4 ${closed.color}`} />}
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
                    <span className="text-xs text-muted-foreground ml-1">
                      {formatToRelativeTime(contact.closedAt)}
                    </span>
                  )}
                </div>
              ) : (
                contact?.waMessageAssignStatus !== WaMessageAssignStatus.UNASSIGNED &&
                contact?.assignedUsers?.length > 0 && (
                  <CustomTooltip
                    trigger={
                      <div className="flex space-x-1">
                        {contact?.assignedUsers?.slice(0, 1).map((a) => {
                          return (
                            <span
                              key={a?.id}
                              className="inline-flex items-center gap-[5px] rounded-full border border-blue-200/50 bg-blue-50 py-[3px] pr-[9px] pl-1 text-[10px] font-extrabold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30"
                            >
                              <span className="flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-extrabold text-white">
                                {a?.name?.charAt(0)?.toUpperCase()}
                              </span>
                              <span className="truncate max-w-[60px]">{a?.name}</span>
                            </span>
                          );
                        })}
                        {contact?.assignedUsers.length > 1 && (
                          <div className="w-5 h-5 rounded-full bg-muted text-[10px] flex items-center justify-center border border-white shrink-0">
                            +{contact?.assignedUsers?.length - 1}
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

            {contact?.waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED && (
              <div className="flex shrink-0">
                <CustomTooltip
                  trigger={
                    <UserX
                      className={`text-[10px] h-4 text-gray-500 dark:text-gray-400 rounded-2xl`}
                    />
                  }
                  content={<span>{translations("UnAssigned")}</span>}
                />
              </div>
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
