import { IconChevronDown, IconTags } from "@tabler/icons-react";
import { ArrowLeft, Ban, BellOff, CircleCheckBig, FolderClosed } from "lucide-react";
import { useMemo } from "react";

import {
  useContactGroup,
  useContactGroupsByContactId,
  useUpdateContactGroupsForContactMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query.tsx";
import {
  useAssignContactLabelsToContactId,
  useContactLabels,
  useEditContactMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { useBlockWhatsAppUser } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useSetIsChatDisplayOpen } from "@/components/dashboard/inbox/ChatDisplayContext.tsx";
import type { ContactWithUpdatedAt } from "@/components/dashboard/inbox/store.ts";
import { useContactsStore, useMessagesStore } from "@/components/dashboard/inbox/store.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox.ts";

import { getContactClosedIcon } from "../../chatselect/chatselectCard/index.tsx";
import { generateInternalMessageId, getSoucePlatformIconAndColor } from "../../util.tsx";
import AssignUser from "./AssignUser.tsx";
import WaInboxCountdownTimer from "./countDown/index.tsx";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactWithUpdatedAt;
}
export default function WaInboxChatDisplayHeader({
  contact,
}: Readonly<WaInboxChatDisplayHeaderProps>) {
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const tags = useLifecycleContext();
  const editContactMutation = useEditContactMutation(null);
  const { data: contactLabels = [], isPending } = useContactLabels();
  const isMobile = useMediaQuery("(max-width: 1200px)");

  const { data: contactgroups, isLoading: contactGroupsLoading } = useContactGroupsByContactId(
    contact.id,
  );
  const { data: groups, isLoading: groupsLoading } = useContactGroup();
  const updateGroupsMutation = useUpdateContactGroupsForContactMutation(contact.id);
  const activeGroupIds = contactgroups?.map((g) => g.id) ?? [];

  const lifecycleGroups = useMemo(
    () => [
      {
        group: "Lifecycle Stages",
        items:
          tags
            ?.filter((label) => label.category !== "lost")
            .map((label) => ({
              id: label.id,
              name: label.name,
              emoji: label.emoji,
              category: label.category,
            })) ?? [],
      },
      {
        group: "Lost Stages",
        items:
          tags
            ?.filter((label) => label.category === "lost")
            .map((label) => ({
              id: label.id,
              name: label.name,
              emoji: label.emoji,
              category: label.category,
            })) ?? [],
      },
    ],
    [tags],
  );

  const allLifecycles = [...lifecycleGroups[0].items, ...lifecycleGroups[1].items];

  const activeLabels = (contact as any)?.contactLabels || [];
  const assign = useAssignContactLabelsToContactId();
  const activeIds = activeLabels.map((l) => l.id);
  const isActive = (labelId: string) => activeIds.includes(labelId);

  function handleToggleLabel(labelId: string) {
    if (!contact?.id) return;
    const nextLabelIds = isActive(labelId)
      ? activeIds.filter((id) => id !== labelId)
      : [...activeIds, labelId];
    const updatedLabels = contactLabels.filter((label) => nextLabelIds.includes(label.id));

    assign.mutate(
      {
        contactId: contact.id,
        labelIds: nextLabelIds,
      },
      {
        onSuccess: () => {
          updateContactById(contact.id, (c) => ({
            ...c,
            contactLabels: updatedLabels,
          }));
        },
      },
    );
  }

  const handleToggleGroup = (groupId: string) => {
    const nextIds = activeGroupIds.includes(groupId)
      ? activeGroupIds.filter((id) => id !== groupId)
      : [...activeGroupIds, groupId];

    const addGroupIds = nextIds.filter((id) => !activeGroupIds.includes(id));

    const removeGroupIds = activeGroupIds.filter((id) => !nextIds.includes(id));

    updateGroupsMutation.mutate({
      contactId: contact.id,
      addGroupIds,
      removeGroupIds,
    });
  };

  const platform = contact?.lastMessage?.sourcePlatform || MessagePlatform.WHATSAPP;

  const isSessionExpired = isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp);
  const { updateContactById } = useContactsStore();

  function handleLifecycleChange(value, lifecycleObj) {
    editContactMutation.mutate(
      {
        data: { lifecycleId: value },
        contactId: contact.id,
      },
      {
        onSuccess: () => {
          updateContactById(contact.id, (contact) => ({
            ...contact,
            lifecycleId: value,
            lifecycleName: `${lifecycleObj.emoji} ${lifecycleObj.name}`,
          }));
        },
      },
    );
  }
  const sourcePlatform = getSoucePlatformIconAndColor(platform);
  if (!contact) return null;
  return (
    <div className="h-14 border-b shrink-0 bg-background flex items-center px-4">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0 shrink">
          {isMobile && (
            <button
              onClick={() => setIsChatDisplayOpen(false)}
              className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
              aria-label="Back to chat list"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="relative shrink-0">
            <CreativeAvatar
              name={
                contact?.name ||
                contact?.whatsappUserName ||
                contact?.phone ||
                contact?.igsId ||
                contact?.psid
              }
              size="md"
              isOnline={!isSessionExpired}
              showOnlineStatus={!isSessionExpired}
              onlineStatusPosition="topLeft"
              showRing={true}
              src={contact?.profilePic}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 shadow-sm ${
                sourcePlatform?.bgColor
              }`}
            >
              {sourcePlatform?.icon}
            </div>
          </div>
          <div className="min-w-0 flex-shrink flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5">
                <h3 className="truncate font-bold text-sm">
                  {contact?.name ||
                    contact?.whatsappUserName ||
                    contact?.phone ||
                    contact?.igsId ||
                    contact?.psid}
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
                      <span>This contact has not consented to receive template messages.</span>
                    }
                  />
                )}
              </div>
            </div>
            {contact?.phone &&
              contact.phone !==
                (contact?.name ||
                  contact?.whatsappUserName ||
                  contact?.phone ||
                  contact?.igsId ||
                  contact?.psid) && (
                <p className="text-[10px] text-muted-foreground truncate -mt-0.5">
                  {contact.phone}
                </p>
              )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="h-8" />}>
              <IconTags className="h-5 w-5 text-primary" />
              <span className="text-primary font-semibold text-xs">Attributes</span>
              <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="p-1 w-fit min-w-60 max-w-70">
              <div className="flex flex-col gap-2 p-2">
                {/* Lifecycle */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Lifecycle Stage
                    </h4>

                    {contact.lifecycleId && (
                      <Button
                        size="xs"
                        className="h-4 rounded-xl py-0.5"
                        variant="destructive"
                        onClick={() =>
                          handleLifecycleChange("", {
                            id: "",
                            name: "",
                            emoji: "",
                            category: "",
                          })
                        }
                      >
                        <span className="text-[10px]">Clear</span>
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 max-h-28 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {allLifecycles.map((lifecycle) => (
                        <Button
                          size="xs"
                          variant="outline"
                          key={lifecycle.id}
                          onClick={() => handleLifecycleChange(lifecycle.id, lifecycle)}
                          className={cn(
                            contact.lifecycleId === lifecycle.id && "border-blue-300 bg-blue-100",
                          )}
                        >
                          <span>{lifecycle.emoji}</span>
                          <span
                            className={cn(
                              "text-[11px] font-bold text-muted-foreground tracking-wide",
                              contact.lifecycleId === lifecycle.id && "text-primary",
                            )}
                          >
                            {lifecycle.name}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {/* Labels */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Labels
                    </h4>

                    {activeLabels.length > 0 && (
                      <Button
                        size="xs"
                        className="h-4 rounded-xl py-0.5"
                        variant="destructive"
                        onClick={() => {
                          assign.mutate(
                            {
                              contactId: contact.id,
                              labelIds: [],
                            },
                            {
                              onSuccess: () => {
                                updateContactById(contact.id, (c) => ({
                                  ...c,
                                  contactLabels: [],
                                }));
                              },
                            },
                          );
                        }}
                      >
                        <span className="text-[10px]">Clear All</span>
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 max-h-28 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {contactLabels.map((label) => {
                        const active = activeIds.includes(label.id);

                        return (
                          <Button
                            key={label.id}
                            size="xs"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleToggleLabel(label.id)}
                            className={cn(active && "border-purple-300 bg-purple-100")}
                          >
                            <span
                              style={{ backgroundColor: label.color }}
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                            />

                            <span
                              className={cn(
                                "text-[11px] font-bold text-muted-foreground tracking-wide truncate",
                                active && "text-primary",
                              )}
                            >
                              {label.name}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {/* contact group */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Contact Groups
                    </h4>

                    {activeGroupIds.length > 0 && (
                      <Button
                        size="xs"
                        className="h-4 rounded-xl py-0.5"
                        variant="destructive"
                        onClick={() =>
                          updateGroupsMutation.mutate({
                            contactId: contact.id,
                            addGroupIds: [],
                            removeGroupIds: activeGroupIds,
                          })
                        }
                      >
                        <span className="text-[10px]">Clear All</span>
                      </Button>
                    )}
                  </div>

                  <div className="mt-2 max-h-28 overflow-y-auto space-y-1 pr-1">
                    {groups?.map((group) => {
                      const active = activeGroupIds.includes(group.id);

                      return (
                        <Button
                          key={group.id}
                          size="sm"
                          variant="outline"
                          disabled={groupsLoading || contactGroupsLoading}
                          onClick={() => handleToggleGroup(group.id)}
                          className={cn(
                            "w-full justify-start gap-2",
                            active && "border-indigo-300 bg-indigo-100",
                          )}
                        >
                          <FolderClosed
                            className={cn(
                              "h-4 w-4 shrink-0 text-yellow-500 fill-yellow-400",
                              active && "text-yellow-600 fill-yellow-500",
                            )}
                          />

                          <span
                            className={cn(
                              "flex-1 truncate text-left text-[11px] font-bold text-muted-foreground",
                              active && "text-primary",
                            )}
                          >
                            {group.name}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* TODO: CHATBOT */}
          {/* {hasAIFeature && chatbot?.enableWaChat && chatbot?.enableAllWaChat && (
            <Popover>
              <PopoverTrigger asChild className="hover:bg-accent p-1 rounded-md">
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
          )} */}
          <WaInboxCountdownTimer timeStamp={contact?.lastReceivedMessageTimeStamp} />
          <AssignUser contactId={contact?.id} />
          <ChatHeaderMenu contact={contact} />
        </div>
      </div>
    </div>
  );
}

const ChatHeaderMenu = ({ contact }) => {
  const editContactMutation = useEditContactMutation(null);
  const messagesStore = useMessagesStore();
  const { user } = useUser();
  const { updateContactById, setSelectedContact } = useContactsStore();
  const confirm = useConfirm();
  const blockmut = useBlockWhatsAppUser();
  const isChatClosed = [
    WaMessageAssignStatus.CLOSED,
    WaMessageAssignStatus.RESOLVED,
    WaMessageAssignStatus.SPAM,
    WaMessageAssignStatus.UNRESOLVED,
  ].includes(contact?.waMessageAssignStatus);

  async function handleBlock() {
    const shouldBlock = await confirm({
      title: `Block ${contact?.name ?? contact?.phone}`,
      description: "Are you sure to block this user?",
      warning: "The blocked user cannot message you and you cannot message the user",
      confirmText: "Block",
      cancelText: "Cancel",
    });

    if (!shouldBlock) return;

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
  function handleCloseChat(status) {
    const message = `marked this chat as ${getStatusLabel(status)}`;
    const id = generateInternalMessageId();
    const newMessage = {
      id: id,
      contactId: contact.id,
      waCreatedAt: new Date().toISOString(),
      messageBody: {
        send: null,
        receive: null,
        internal: {
          text: {
            body: message,
          },
          assignedUsers: [],
          assignStatus: status,
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
    messagesStore.addMessage(`${contact.id}_all`, newMessage as any);
    messagesStore.addMessage(`${contact.id}_internal`, newMessage as any);
    editContactMutation.mutate(
      {
        contactId: contact.id,
        data: { waMessageAssignStatus: status, messageId: id },
      },
      {
        onSuccess: () => {
          updateContactById(contact.id, (existing) => ({
            ...existing,
            waMessageAssignStatus: status,
            closedAt: new Date().toISOString(),
            closedUser: {
              name: user?.userName,
              id: user.userId,
            },
            assignedUsers: [],
          }));
        },
        onError: () => {
          messagesStore.removeMessage(`${contact.id}_all`, id);
          messagesStore.removeMessage(`${contact.id}_internal`, id);
        },
      },
    );
  }
  if (isChatClosed) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700 data-open:bg-green-700 px-2 border-transparent shadow-none"
          />
        }
      >
        <CircleCheckBig className="w-2 h-2 text-white" />
        <span className="text-white text-xs">Close</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleCloseChat(WaMessageAssignStatus.RESOLVED)}
          disabled={
            editContactMutation.isPending ||
            contact?.waMessageAssignStatus === WaMessageAssignStatus.RESOLVED
          }
        >
          {(() => {
            const closedStatusIcon = getContactClosedIcon(WaMessageAssignStatus.RESOLVED);
            const Icon = closedStatusIcon.icon;
            return <Icon className={closedStatusIcon.color} />;
          })()}
          Mark as Resolved
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCloseChat(WaMessageAssignStatus.CLOSED)}
          disabled={
            editContactMutation.isPending ||
            contact?.waMessageAssignStatus === WaMessageAssignStatus.CLOSED
          }
        >
          {(() => {
            const closedStatusIcon = getContactClosedIcon(WaMessageAssignStatus.CLOSED);
            const Icon = closedStatusIcon.icon;
            return <Icon className={closedStatusIcon.color} />;
          })()}
          Mark as Closed
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCloseChat(WaMessageAssignStatus.SPAM)}
          disabled={
            editContactMutation.isPending ||
            contact?.waMessageAssignStatus === WaMessageAssignStatus.SPAM
          }
        >
          {(() => {
            const closedStatusIcon = getContactClosedIcon(WaMessageAssignStatus.SPAM);
            const Icon = closedStatusIcon.icon;
            return <Icon className={closedStatusIcon.color} />;
          })()}
          Mark as Spam
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCloseChat(WaMessageAssignStatus.UNRESOLVED)}
          disabled={
            editContactMutation.isPending ||
            contact?.waMessageAssignStatus === WaMessageAssignStatus.UNRESOLVED
          }
        >
          {(() => {
            const closedStatusIcon = getContactClosedIcon(WaMessageAssignStatus.UNRESOLVED);
            const Icon = closedStatusIcon.icon;
            return <Icon className={closedStatusIcon.color} />;
          })()}
          <CustomTooltip
            trigger={<p>Mark as Unresolved</p>}
            content={<p>All the assignees will be removed as closed,resolved and spam</p>}
          />
        </DropdownMenuItem>
        {!isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp) &&
          !contact?.blockedOnWhatsApp && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                <Ban className="w-4 h-4 mr-2 text-destructive" />
                Block contact
              </DropdownMenuItem>
            </>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function getStatusLabel(status: string): string | null {
  const map: Record<string, string> = {
    [WaMessageAssignStatus.CLOSED]: "closed",
    [WaMessageAssignStatus.SPAM]: "spam",
    [WaMessageAssignStatus.RESOLVED]: "resolved",
    [WaMessageAssignStatus.UNRESOLVED]: "unresolved",
  };
  return map[status] ?? null;
}
