import { useEffect, useMemo, useRef, useState } from "react";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
  createFileRoute,
  Link,
  useParams,
  useRouter,
} from "@tanstack/react-router";
import parse from "html-react-parser";
import {
  Check,
  ExternalLink,
  FileText,
  History,
  ListPlus,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Trash,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { QuestionType2 } from "@/types/enums.ts";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import {
  useCardById,
  useCardTeamMembersById,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateCardMutation,
} from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import TicketTextEditor from "@/components/RichTextEditor/TicketTextEditor.tsx";
import { getCellData } from "@/components/Survey/Response/WaResponses.tsx";
import SurveyResponsesView from "@/components/Tickets/SingleTicket/SurveyResponsesView.tsx";
import { TicketChat } from "@/components/Tickets/TicketChat.tsx";
import type {
  Activity,
  Card,
  TicketComment,
  WaAutomatedReplyMessage,
} from "@/components/Tickets/types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { formatToRelativeTime } from "@/utils/dateTime.ts";
import { TicketType } from "@/utils/enums/ticket.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

export const Route = createFileRoute("/dashboard/tickets/$ticketId/")({
  component: CardDetailPage,
});

// Custom debounce hook to avoid @mantine/hooks
function useDebounce<T>(value: T, delay: number): [T] {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return [debouncedValue];
}

const PRIORITY_MAP: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  LOW: {
    label: "Low",
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-transparent",
  },
  MEDIUM: {
    label: "Medium",
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-transparent",
  },
  HIGH: {
    label: "High",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-transparent",
  },
  CRITICAL: {
    label: "Critical",
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-transparent",
  },
};

function CardDetailPage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false });
  const ticketId = params?.ticketId as string;

  const { data: card, isPending, error } = useCardById(ticketId);

  const questions = useMemo(() => {
    return card?.surveyResponse?.surveyTeamMap?.survey?.WaFlow?.json?.screens?.flatMap(
      (screen: any) =>
        screen.layout.children
          .filter((child: any) => child.type !== QuestionType2.Footer)
          .map(
            ({
              id,
              label,
              metaType,
              name,
              "data-source": dataSource,
              header,
            }: any) => ({
              id,
              label,
              metaType,
              dataSource,
              name,
              header,
            }),
          )
          .filter(({ name }: any) => name),
    );
  }, [card]);

  if (isPending) return <RateupLoader aria-label={t("Loading ticket...")} />;
  if (error)
    return (
      <div className="p-4 text-red-500">
        {t("Error loading ticket")}: {error.message}
      </div>
    );
  if (!card) return <div className="p-4">{t("Ticket not found")}</div>;

  const { history } = useRouter();

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) history.back();
      }}
    >
      <DialogContent className="max-w-[95vw] w-full md:min-w-2xl lg:min-w-4xl xl:min-w-6xl h-[95vh] p-0 overflow-hidden flex flex-col bg-muted/20 gap-0">
        <DialogTitle className="sr-only">{t("Ticket Details")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("View and edit ticket details.")}
        </DialogDescription>
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Main Left Content */}
          <div className="flex-1 flex flex-col bg-background p-4 md:p-6 min-h-0 border-r">
            <EditTicket ticket={card} ticketId={ticketId} />

            <div className="mt-6 pt-4 border-t flex-1 flex flex-col min-h-0">
              <Tabs
                defaultValue="activity"
                className="flex flex-col h-full w-full"
              >
                <TabsList className="mb-2 shrink-0 justify-start h-auto flex-wrap">
                  <TabsTrigger value="activity" className="gap-2">
                    <History className="w-4 h-4" /> {t("Activity")}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-2">
                    <MessageCircle className="w-4 h-4" /> {t("Comments")}
                  </TabsTrigger>
                  {card.surveyResponseId && (
                    <TabsTrigger value="response" className="gap-2">
                      <FileText className="w-4 h-4" /> {t("Response Details")}
                    </TabsTrigger>
                  )}
                  {card.waAutomatedReplyMessageId && (
                    <TabsTrigger value="automation" className="gap-2">
                      <MessageSquare className="w-4 h-4" /> {t("Automation")}
                    </TabsTrigger>
                  )}
                  {(card.type === TicketType.AUTOMATION ||
                    card.type === TicketType.FLOW_RESPONSE ||
                    !!card.contactId) && (
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageSquare className="w-4 h-4" /> {t("Chat")}
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-2">
                  <TabsContent value="activity" className="mt-0">
                    <TicketActivity activities={card?.ticketActivities || []} />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <TicketComments
                      data={card?.ticketComments || []}
                      ticketCardId={ticketId}
                    />
                  </TabsContent>

                  {card.surveyResponseId && (
                    <TabsContent value="response" className="mt-0">
                      <TicketResponse
                        surveyResponse={card.surveyResponse}
                        questions={questions}
                        type={card.type}
                      />
                    </TabsContent>
                  )}

                  {card.waAutomatedReplyMessageId && (
                    <TabsContent value="automation" className="mt-0">
                      <TicketAutomationResponse
                        response={card.waAutomatedReplyMessage}
                      />
                    </TabsContent>
                  )}

                  {(card.type === TicketType.AUTOMATION ||
                    card.type === TicketType.FLOW_RESPONSE ||
                    !!card.contactId) && (
                    <TabsContent value="chat" className="mt-0 h-[600px]">
                      <TicketChat
                        contact={
                          card.contactId
                            ? card.contact
                            : card.surveyResponseId
                              ? card?.surveyResponse?.Contact
                              : card?.waAutomatedReplyMessage?.contact
                        }
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full md:w-72 shrink-0 bg-background/50 p-4 md:p-6 overflow-y-auto">
            <RightSidebar ticket={card} ticketId={ticketId} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignContact({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useContacts(
    { pageIndex: 0, pageSize: 20 },
    search,
  );
  const { mutate, isPending } = useUpdateCardMutation();

  const handleAssign = (contactId: string) => {
    mutate({ id: ticketId, contactId });
    setOpen(false);
  };

  return (
    <div>
      <div className="text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase mb-2">
        {t("Customer")}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full text-xs border-dashed flex gap-2 justify-start font-normal text-muted-foreground h-10"
          >
            <UserPlus className="h-4 w-4" /> {t("Add Contact")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder={t("Search contact...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
            />
          </div>
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="p-4 text-xs text-center text-muted-foreground">
                {t("Loading...")}
              </div>
            ) : data?.users?.length === 0 ? (
              <div className="p-4 text-xs text-center text-muted-foreground">
                {t("No contacts found.")}
              </div>
            ) : (
              <div className="flex flex-col">
                {data?.users?.map((contact) => (
                  <button
                    key={contact.id}
                    disabled={isPending}
                    onClick={() => handleAssign(contact.id)}
                    className="flex items-center gap-2 p-2 hover:bg-muted text-left transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-semibold bg-muted">
                        {contact.name?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-medium truncate">
                        {contact.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        +{contact.phone}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function RightSidebar({
  ticket,
  ticketId,
}: {
  ticket: Card;
  ticketId: string;
}) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const { data: members = [] } = useCardTeamMembersById(ticketId);
  console.log(ticket);

  const linkedContact = ticket.contactId
    ? ticket.contact
    : ticket.surveyResponseId
      ? ticket?.surveyResponse?.Contact
      : ticket?.waAutomatedReplyMessage?.contact;

  const handlePriorityChange = (priority: string) => {
    mutate({ id: ticketId, priority });
  };

  const handleToggleMember = (userId: string) => {
    const currentMembers = ticket.assignees?.map((a) => a.assigneeId) || [];
    const isSelected = currentMembers.includes(userId);
    const newMembers = isSelected
      ? currentMembers.filter((id) => id !== userId)
      : [...currentMembers, userId];
    mutate({ id: ticketId, assignedToIds: newMembers });
  };

  const assignedMembers = ticket.assignees?.map((a) => a.assigneeId) || [];
  const p = PRIORITY_MAP[ticket.priority || "MEDIUM"] || PRIORITY_MAP.MEDIUM;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <div className="text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase mb-2">
            {t("Priority")}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRIORITY_MAP).map((key) => {
              const info = PRIORITY_MAP[key];
              const isActive =
                ticket.priority === key ||
                (!ticket.priority && key === "MEDIUM");
              return (
                <button
                  key={key}
                  onClick={() => handlePriorityChange(key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all border-2 ${
                    isActive
                      ? `${info.border} ring-2 ring-offset-1 ring-${info.bg.split("-")[1]}-400`
                      : "border-transparent hover:bg-muted"
                  } ${info.bg} ${info.text}`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase mb-2">
            {t("Assignee")}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {assignedMembers.map((memberId) => {
              const user = members.find((m) => m.id === memberId);
              if (!user) return null;
              return (
                <Tooltip key={user.id}>
                  <TooltipTrigger asChild>
                    <Avatar
                      className="h-8 w-8 border hover:opacity-80 transition cursor-pointer"
                      onClick={() => handleToggleMember(user.id)}
                    >
                      <AvatarImage src={getFileUrlFromKey(user.profilePhoto)} />
                      <AvatarFallback>
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{user.name}</TooltipContent>
                </Tooltip>
              );
            })}

            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 w-8 rounded-full border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="start">
                <ScrollArea className="h-64">
                  {members.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t("No members found")}
                    </div>
                  ) : (
                    members.map((user) => {
                      const isSelected = assignedMembers.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleToggleMember(user.id)}
                          className="w-full flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm transition"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={getFileUrlFromKey(user.profilePhoto)}
                              />
                              <AvatarFallback>
                                {user.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
          {assignedMembers.length === 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              {t("Unassigned")}
            </div>
          )}
        </div>
        {linkedContact ? (
          <div>
            <div className="text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase mb-2">
              {t("Customer")}
            </div>
            <div className="border rounded-xl p-4 bg-card shadow-sm flex flex-col gap-4 relative group">
              {ticket.contactId && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    mutate({ id: ticketId, contactId: null });
                  }}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors z-10 bg-background rounded-full p-1 border shadow-sm"
                  title={t("Remove contact")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center gap-3 relative">
                <Avatar className="h-12 w-12 border bg-muted flex items-center justify-center">
                  <span className="font-semibold text-muted-foreground">
                    {linkedContact.name?.substring(0, 2).toUpperCase() || "CN"}
                  </span>
                </Avatar>
                <div className="absolute left-8 bottom-0 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-foreground">
                    {linkedContact.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    +{linkedContact.phone}
                  </span>
                </div>
              </div>
              <Link
                to={`/dashboard/inbox?tab=mine&contactId=${linkedContact.id}`}
                className="w-full"
              >
                <Button
                  variant="default"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-2 h-10 rounded-lg font-semibold"
                >
                  <IconBrandWhatsapp className="h-4 w-4" />
                  {t("Open Chat in Inbox")}{" "}
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <AssignContact ticketId={ticketId} />
        )}
      </div>
    </TooltipProvider>
  );
}

function EditTicket({ ticket, ticketId }: { ticket: Card; ticketId: string }) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const [title, setTitle] = useState(ticket.title || "");
  const [description, setDescription] = useState(ticket.description || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const [debouncedTitle] = useDebounce(title, 800);
  const [debouncedDescription] = useDebounce(description, 1000);

  useEffect(() => {
    if (debouncedTitle !== ticket.title) {
      mutate({ id: ticketId, title: debouncedTitle });
    }
  }, [debouncedTitle, ticketId, mutate, ticket.title]);

  useEffect(() => {
    if (
      debouncedDescription !== ticket.description &&
      debouncedDescription !== ""
    ) {
      mutate({ id: ticketId, description: debouncedDescription });
    }
  }, [debouncedDescription, ticketId, mutate, ticket.description]);

  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* Title */}
      <div>
        {isEditingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIsEditingTitle(false);
            }}
            className="text-2xl font-bold tracking-tight text-foreground border-b-2 border-primary outline-none w-full bg-transparent pb-1"
          />
        ) : (
          <div
            onClick={() => {
              setIsEditingTitle(true);
              setTimeout(() => titleRef.current?.focus(), 20);
            }}
            className="group flex items-center gap-2 cursor-text rounded-md hover:bg-muted/50 p-1 -ml-1 transition-colors"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title || t("Untitled Ticket")}
            </h1>
            <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Description Editor */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase">
            {t("Description")}
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Add a description...")}
          className="min-h-[80px] bg-muted/30 resize-y"
        />
      </div>
    </div>
  );
}

function TicketComments({
  data,
  ticketCardId,
}: {
  data: Array<TicketComment>;
  ticketCardId: string;
}) {
  const { t } = useTranslation();
  const { mutate } = useCreateCommentMutation(ticketCardId);
  const handleAddComment = (comment: string) => {
    mutate({ msg: comment, ticketCardId });
  };
  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="flex gap-4 items-start">
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <TicketTextEditor
            onUpdate={handleAddComment}
            content={""}
            placeholder={t("Add a comment...")}
            saveBtn
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {data.map((comment) => (
          <Comment {...comment} key={comment?.id} cardId={ticketCardId} />
        ))}
      </div>
    </div>
  );
}

function Comment(data: TicketComment & { cardId: string }) {
  const { user } = useUser();
  const { mutate, isPending } = useDeleteCommentMutation(data.cardId);
  if (!data) return null;
  return (
    <div className="flex gap-4 items-start group">
      <Avatar className="h-8 w-8">
        <AvatarImage src={data?.createdBy?.profilePhoto} />
        <AvatarFallback>{data?.createdBy?.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold capitalize">
            {data.createdBy?.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatToRelativeTime(data.createdAt)}
          </span>
        </div>
        <div className="text-sm text-foreground bg-muted/40 border rounded-tl-sm rounded-tr-xl rounded-br-xl rounded-bl-xl px-3 py-2 leading-relaxed">
          {parse(data.text)}
        </div>
      </div>
      {data?.createdById === user?.userId && (
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
          disabled={isPending}
          onClick={() => mutate(data.id)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function TicketActivity({ activities }: { activities: Array<Activity> }) {
  const { t } = useTranslation();
  if (!activities || activities.length === 0)
    return (
      <div className="text-sm text-muted-foreground p-4">
        {t("No activity yet.")}
      </div>
    );

  return (
    <div className="flex flex-col gap-4 mt-4 relative before:absolute before:inset-y-0 before:left-[15px] before:w-[2px] before:bg-border">
      {activities.map((activity) => {
        let title = "";
        let IconCmp = ListPlus;

        switch (activity.type) {
          case "ADDED_CARD":
            title = `${activity.user?.name ?? "System"} added this card to ${activity.details?.title || "a column"}`;
            IconCmp = ListPlus;
            break;
          case "ADDED_MEMBER":
            title = `${activity.user?.name} added ${activity.details?.memberName || "someone"} to this card`;
            IconCmp = User;
            break;
          case "EDITED_CARD":
            title = `${activity.user?.name} edited this card`;
            IconCmp = User;
            break;
          case "MOVED_CARD":
            title = `${activity.user?.name} moved this card from ${activity.details?.fromColumnName || "a column"} to ${activity.details?.toColumnName || "another column"}`;
            IconCmp = ListPlus;
            break;
          default:
            title = `${activity.user?.name} updated this card`;
        }

        return (
          <div key={activity.id} className="relative flex gap-4 items-start">
            <div className="h-8 w-8 rounded-full bg-background border-2 flex items-center justify-center z-10 shrink-0">
              <IconCmp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col pt-1.5">
              <span className="text-sm text-foreground">{title}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {formatToRelativeTime(activity.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketResponse({ surveyResponse, questions, type }: any) {
  return (
    <ScrollArea className="max-h-[80vh] p-2 mt-4">
      <div className="flex flex-col gap-4">
        {type === TicketType.SURVEY_RESPONSE ? (
          <div className="flex flex-col gap-4">
            {surveyResponse?.responses?.map((response: any, index: number) => {
              const question =
                surveyResponse?.surveyTeamMap?.survey?.questions?.find(
                  (q: any) => q.id === response.questionId,
                );
              if (!question) return null;
              return (
                <SurveyResponsesView
                  response={response}
                  question={question}
                  type={response.type}
                  no={index + 1}
                  language={surveyResponse?.language}
                  key={index}
                />
              );
            })}
          </div>
        ) : (
          questions?.map((question: any, index: number) => (
            <div key={question.id} className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{index + 1}</Badge>
                <span className="text-sm font-medium">
                  {markdownToPlainText(question.header || question.label)}
                </span>
              </div>
              <div className="text-sm bg-muted/40 p-2 rounded-md">
                {getCellData(
                  surveyResponse?.responses?.find(
                    (res: any) => res.questionId === question.id,
                  )?.response,
                  question,
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

function TicketAutomationResponse({ response }: any) {
  const { t } = useTranslation();
  return (
    <ScrollArea className="max-h-[80vh] p-2 mt-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-bold">{t("Automation Details")}</h4>
          <Badge variant="secondary">
            {response?.waAutomatedReply?.name || "Unnamed Automation"}
          </Badge>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {response?.contact?.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {response?.contact?.phone}
              </span>
            </div>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border text-sm mt-2 whitespace-pre-wrap">
            {response?.content}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
