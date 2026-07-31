import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import parse from "html-react-parser";
import {
  AlertCircle,
  Check,
  CheckSquare,
  ExternalLink,
  FileText,
  History,
  ListPlus,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Tag,
  Trash,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { deleteCard, moveCard } from "@/backend/tickets/tickets.api";
import {
  useBoardsQueries,
  useCardById,
  useCardTeamMembersById,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateCardMutation,
  useLabels,
} from "@/backend/tickets/tickets.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import TicketTextEditor from "@/components/RichTextEditor/TicketTextEditor.tsx";
import { getCellData } from "@/components/Survey/Response/WaResponses.tsx";
import { getUserColor } from "@/components/Tickets/BoardContent";
import { parseColor } from "@/components/Tickets/card.tsx";
import SurveyResponsesView from "@/components/Tickets/SingleTicket/SurveyResponsesView.tsx";
import type { Activity, Card, TicketComment } from "@/components/Tickets/types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { markdownToPlainText } from "@/components/whatsapp/flow-v2/FlowScreensList/ScreenListItem.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { QuestionType2 } from "@/types/enums.ts";
import { formatToRelativeTime } from "@/utils/dateTime.ts";
import { TicketType } from "@/utils/enums/ticket.ts";
import { deleteUploadedFiles, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

export const Route = createFileRoute("/dashboard/tickets/$ticketId/")({
  component: CardDetailPage,
});

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

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-body text-[11px] font-bold text-muted-foreground tracking-[0.07em] uppercase mb-[7px]">
      {children}
    </div>
  );
}

function DateRow({
  label,
  value,
  warn,
  color,
}: Readonly<{
  label: string;
  value: string | Date | null | undefined;
  warn?: boolean;
  color?: string;
}>) {
  const fmt = value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex justify-between items-center">
      <span className="font-body text-xs text-muted-foreground">{label}</span>
      {fmt ? (
        <span
          className={`font-body text-xs font-semibold flex items-center gap-1 ${!color && warn ? "text-red-600" : ""}`}
          style={{ color: color || undefined }}
        >
          {warn && (
            <AlertCircle
              size={11}
              className={!color ? "text-red-600" : undefined}
              style={{ color: color || undefined }}
              strokeWidth={2}
            />
          )}
          {fmt}
        </span>
      ) : (
        <span className="font-body text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

function CardDetailPage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false });
  const ticketId = params?.ticketId as string;

  const { history } = useRouter();
  const { data: card, isPending, error } = useCardById(ticketId);

  const questions = useMemo(() => {
    return card?.surveyResponse?.surveyTeamMap?.survey?.WaFlow?.json?.screens?.flatMap(
      (screen: any) =>
        screen.layout.children
          .filter((child: any) => child.type !== QuestionType2.Footer)
          .map(({ id, label, metaType, name, "data-source": dataSource, header }: any) => ({
            id,
            label,
            metaType,
            dataSource,
            name,
            header,
          }))
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

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) history.back();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[100vw] md:max-w-[75vw] w-full md:min-w-2xl lg:min-w-4xl xl:min-w-6xl h-screen md:h-[95vh] p-0 overflow-hidden flex flex-col bg-background gap-0 border-none shadow-[0_32px_80px_rgba(11,31,72,.26)] rounded-none md:rounded-[20px]"
      >
        <DialogTitle className="sr-only">{t("Ticket Details")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("View and edit ticket details.")}
        </DialogDescription>

        <TicketTopHeader ticket={card} ticketId={ticketId} onClose={() => history.back()} />

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0 bg-background">
          <div className="w-full md:w-72 shrink-0 bg-slate-50 dark:bg-muted/20 md:overflow-y-auto md:order-2 border-b md:border-b-0 md:border-l border-border">
            <div className="p-4 md:p-5 bg-ink-25 dark:bg-muted/20 ">
              <RightSidebar ticket={card} ticketId={ticketId} onClose={() => history.back()} />
            </div>
          </div>
          {/* Main Left Content */}
          <div className="flex-1 flex flex-col overflow-y-auto md:overflow-y-auto md:border-r border-border md:order-1 min-h-0">
            {/* Top area - description, checklists, etc. */}
            <div className="p-4 md:p-[22px_24px] md:pb-0 shrink-0">
              <EditTicket ticket={card} ticketId={ticketId} />
            </div>

            {/* Bottom - Tabs */}
            <div className="flex-1 p-4 md:p-[22px_24px] md:pt-4">
              <Tabs defaultValue="comments" className="w-full">
                <TabsList className="shrink-0 justify-start h-auto flex-wrap bg-transparent p-0 rounded-none gap-0">
                  <TabsTrigger
                    value="comments"
                    className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-3 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {t("Comments")}
                    {(card.ticketComments?.length || 0) > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                        {card.ticketComments?.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-3 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                  >
                    <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {t("Activity")}
                    {(card.ticketActivities?.length || 0) > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                        {card.ticketActivities?.length}
                      </span>
                    )}
                  </TabsTrigger>
                  {card.surveyResponseId && (
                    <TabsTrigger
                      value="response"
                      className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-1 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {t("Response Details")}
                    </TabsTrigger>
                  )}
                  {card.waAutomatedReplyMessageId && (
                    <TabsTrigger
                      value="automation"
                      className="group gap-1.5 md:gap-2 text-xs md:text-[13px] font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none! shadow-none rounded-none px-1 pb-2.5 pt-2 border-b-2 border-transparent data-[state=active]:border-b-primary transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {t("Automation")}
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="pr-1 md:pr-2">
                  <TabsContent value="activity" className="mt-0">
                    <TicketActivity activities={card?.ticketActivities || []} />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <TicketComments data={card?.ticketComments || []} ticketCardId={ticketId} />
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
                      <TicketAutomationResponse response={card.waAutomatedReplyMessage} />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignContact({ ticketId }: Readonly<{ ticketId: string }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useContacts({ pageIndex: 0, pageSize: 20 }, search);
  const { mutate, isPending } = useUpdateCardMutation();

  const handleAssign = (contactId: string) => {
    mutate({ id: ticketId, contactId });
    setOpen(false);
  };

  return (
    <div>
      <MetaLabel>{t("Customer")}</MetaLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-full text-xs border-dashed flex gap-2 justify-start font-normal text-muted-foreground h-10"
            />
          }
        >
          <UserPlus className="h-4 w-4" /> {t("Add Contact")}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-1" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder={t("Search contact...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
            />
          </div>
          <div
            className="max-h-64 overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="p-4 text-xs text-center text-muted-foreground">{t("Loading...")}</div>
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
                      <span className="text-xs font-medium truncate">{contact.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        +{contact.phone}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function useDeleteCardMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      onSuccess?.();
    },
  });
}

function useMoveCardColumnMutation(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { cardId: string; sourceColumnId: string; targetColumnId: string }) =>
      moveCard(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Column updated!", { id: "move-col-success" });
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to move card.", {
        id: "move-col-error",
      });
    },
  });
}

function RightSidebar({
  ticket,
  ticketId,
  onClose,
}: Readonly<{
  ticket: Card;
  ticketId: string;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const { data: members = [] } = useCardTeamMembersById(ticketId);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteCardMutation = useDeleteCardMutation(onClose);
  const moveColMutation = useMoveCardColumnMutation(ticketId);
  const { data: boards } = useBoardsQueries();
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isImage = (key: string) => /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(key);

  const ALLOWED_MIME_TYPES = new Set([
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ]);

  const isAllowedFile = (file: File) => ALLOWED_MIME_TYPES.has(file.type);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const currentCount = (ticket.attachments || []).length;
    const MAX_ATTACHMENTS = 4;

    if (currentCount >= MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed per ticket.`);
      e.target.value = "";
      return;
    }

    const invalidFiles = selected.filter((f) => !isAllowedFile(f));
    let validFiles = selected.filter((f) => isAllowedFile(f));

    if (invalidFiles.length > 0) {
      toast.dismiss("upload-file");
      toast.error(
        `${invalidFiles.map((f) => f.name).join(", ")} — only images and documents are allowed. Videos and audio files are not supported.`,
        { id: "upload-file" },
      );
    }

    const slotsLeft = MAX_ATTACHMENTS - currentCount;
    if (validFiles.length > slotsLeft) {
      toast.error(
        `Only ${slotsLeft} more attachment${slotsLeft === 1 ? "" : "s"} can be added (max ${MAX_ATTACHMENTS}).`,
      );
      validFiles = validFiles.slice(0, slotsLeft);
    }

    if (!validFiles.length) {
      e.target.value = "";
      return;
    }

    setIsUploadingFile(true);
    try {
      const newKeys: string[] = [];
      for (const file of validFiles) {
        const fileKey = await uploadFile(file);
        newKeys.push(fileKey);
      }
      const currentKeys: string[] = (ticket.attachments as string[]) || [];
      const updatedKeys = [...currentKeys, ...newKeys];
      mutate({ id: ticketId, attachments: updatedKeys });
    } catch {
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const removeAttachment = async (key: string) => {
    await deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
    const currentKeys: string[] = (ticket.attachments as string[]) || [];
    const updatedKeys = currentKeys.filter((k) => k !== key);
    mutate({ id: ticketId, attachments: updatedKeys });
    setAttachmentToDelete(null);
  };

  const linkedContact = ticket.contactId
    ? ticket.contact
    : ticket.surveyResponseId
      ? ticket?.surveyResponse?.Contact
      : ticket?.waAutomatedReplyMessage?.contact;

  let isCloseToDueDate = false;
  let isOverdue = false;

  if (ticket.deadline) {
    const dueDateObj = new Date(ticket.deadline);
    const now = Date.now();
    isOverdue = dueDateObj.getTime() < now;
    const twoDaysFromNow = now + 2 * 24 * 60 * 60 * 1000;
    isCloseToDueDate = !isOverdue && dueDateObj.getTime() <= twoDaysFromNow;
  }

  const dueDateColor = isOverdue ? "#DC2626" : isCloseToDueDate ? "#D97706" : undefined;

  const currentBoard = (boards || []).find((b) =>
    b.ticketColumns?.some((c: any) => c.id === ticket.ticketColumnId),
  );

  const handleToggleMember = (userId: string) => {
    const currentMembers = ticket.assignees?.map((a) => a.assigneeId) || [];
    const isSelected = currentMembers.includes(userId);
    const newMembers = isSelected
      ? currentMembers.filter((id) => id !== userId)
      : [...currentMembers, userId];
    mutate({ id: ticketId, assignedToIds: newMembers });
  };

  const assignedMembers = ticket.assignees?.map((a) => a.assigneeId) || [];

  // Get columns only from the current board
  const boardColumns = currentBoard?.ticketColumns || [];

  // Get creator from first ADDED_CARD activity
  const creatorActivity = (ticket.ticketActivities || [])
    .filter((a) => a.type === "ADDED_CARD")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
  const creator = creatorActivity?.user;

  const handleColumnChange = (targetColumnId: string) => {
    if (!ticket.ticketColumnId || targetColumnId === ticket.ticketColumnId) return;
    moveColMutation.mutate({
      cardId: ticketId,
      sourceColumnId: ticket.ticketColumnId,
      targetColumnId,
    });
  };

  return (
    <>
      <TooltipProvider>
        <div className="flex flex-col gap-6">
          {/* Column selector */}
          {boardColumns.length > 0 && (
            <div>
              <MetaLabel>{t("Column")}</MetaLabel>
              <Select
                value={ticket.ticketColumnId || ""}
                onValueChange={(value) => handleColumnChange(value ?? "")}
                disabled={moveColMutation.isPending}
                items={boardColumns.map((col: any) => ({ value: col.id, label: col.title }))}
              >
                <SelectTrigger className="w-full h-9 text-[13px] font-body">
                  <SelectValue placeholder={t("Select column")} />
                </SelectTrigger>
                <SelectContent>
                  {boardColumns.map((col: any) => (
                    <SelectItem key={col.id} value={col.id} className="text-[13px] font-body">
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <MetaLabel>{t("Assignee")}</MetaLabel>
            <div className="flex flex-wrap gap-2 items-center">
              {members.map((user) => {
                const isSelected = assignedMembers.includes(user.id);
                const userColor = getUserColor(user.id);
                return (
                  <Tooltip key={user.id}>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() => handleToggleMember(user.id)}
                          style={{
                            outline: isSelected
                              ? `2.5px solid ${userColor}`
                              : "2.5px solid transparent",
                            outlineOffset: 1.5,
                          }}
                          className="rounded-full border-none bg-transparent p-0 transition-all duration-150 cursor-pointer flex hover:scale-105"
                        />
                      }
                    >
                      <Avatar className="h-8 w-8 border-none">
                        <AvatarImage src={getFileUrlFromKey(user.profilePhoto ?? "") ?? ""} />
                        <AvatarFallback
                          className="text-xs font-bold text-white"
                          style={{ backgroundColor: userColor }}
                        >
                          {user.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{user.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            {assignedMembers.length > 0 ? (
              <div className="mt-2 font-body text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {assignedMembers
                    .map((id) => members.find((m) => m.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </strong>
              </div>
            ) : (
              <div className="mt-2 font-body text-xs text-muted-foreground">{t("Unassigned")}</div>
            )}
          </div>
          {linkedContact ? (
            <div>
              <MetaLabel>{t("Customer")}</MetaLabel>
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
                    <span className="font-bold text-sm text-foreground">{linkedContact.name}</span>
                    <span className="text-xs text-muted-foreground">+{linkedContact.phone}</span>
                  </div>
                </div>
                <Link
                  to={`/dashboard/inbox?tab=All&contactId=${linkedContact.id}`}
                  className="w-full"
                >
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 h-10 rounded-lg font-semibold">
                    <IconBrandWhatsapp className="h-4 w-4" />
                    {t("Open Chat In Inbox")}
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <AssignContact ticketId={ticketId} />
          )}

          <div>
            <MetaLabel>{t("Dates")}</MetaLabel>
            <div className="flex flex-col gap-2">
              <DateRow label={t("Created")} value={ticket.createdAt} />
              {ticket.deadline && (
                <DateRow
                  label={t("Due Date")}
                  value={ticket.deadline}
                  warn={isOverdue || isCloseToDueDate}
                  color={dueDateColor}
                />
              )}
            </div>
          </div>

          {/* Created by */}
          {creator && (
            <div>
              <MetaLabel>{t("Created by")}</MetaLabel>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border-none">
                  <AvatarImage src={creator.profilePhoto ?? undefined} />
                  <AvatarFallback
                    className="text-[10px] font-bold text-white"
                    style={{ backgroundColor: getUserColor(creator.id) }}
                  >
                    {creator.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-body text-[13px] text-foreground font-medium">
                  {creator.name}
                </span>
              </div>
            </div>
          )}

          <div>
            <MetaLabel>{t("Attachments")}</MetaLabel>
            <div className="flex gap-[7px] flex-wrap mt-1">
              {((ticket.attachments as string[]) || []).map((key: string) => {
                const fileIsImage = isImage(key);
                const fileUrl = getFileUrlFromKey(key);
                const ext = key.split(".").pop()?.toUpperCase() ?? "FILE";
                return (
                  <div
                    key={key}
                    title={key}
                    className="w-14 h-14 relative group rounded-[9px] bg-muted border border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer overflow-hidden transition-colors hover:border-primary"
                    onClick={() => {
                      if (fileIsImage) {
                        setLightboxImage(fileUrl ?? null);
                      } else {
                        window.open(fileUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    {fileIsImage ? (
                      <>
                        <img
                          src={fileUrl}
                          alt={key}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn
                            size={18}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <Paperclip size={18} />
                        <span className="text-[9px] truncate w-full text-center px-1 mt-1 opacity-60">
                          {ext}
                        </span>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ExternalLink
                            size={14}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachmentToDelete(key);
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Remove attachment"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}

              {((ticket.attachments as string[]) || []).length < 4 && (
                <FieldTitle className="w-14 h-14 rounded-[9px] border-[1.5px] border-dashed border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors bg-background">
                  {isUploadingFile ? (
                    <Loader2 size={15} className="animate-spin text-primary" />
                  ) : (
                    <Plus size={15} />
                  )}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleSelectFiles}
                    disabled={isUploadingFile}
                  />
                </FieldTitle>
              )}
            </div>
          </div>

          {/* Delete card */}
          <div className="pt-3 border-t border-border mt-auto">
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 rounded-lg border-none bg-transparent text-destructive font-body text-[12.5px] font-medium cursor-pointer flex items-center justify-center gap-1.5 transition-colors hover:bg-destructive/10"
            >
              <Trash2 size={13} strokeWidth={2} />
              {t("Delete ticket")}
            </button>
          </div>
        </div>
      </TooltipProvider>
      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-background rounded-xl p-6 shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base mb-1">{t("Delete Ticket")}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t("Are you sure you want to delete this ticket? This action cannot be undone.")}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteCardMutation.isPending}
                onClick={() => deleteCardMutation.mutate(ticketId)}
              >
                {deleteCardMutation.isPending ? t("Deleting...") : t("Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/80 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X size={20} />
          </button>
          <img
            src={lightboxImage}
            alt="Attachment preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Delete Confirmation */}
      {attachmentToDelete && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6"
          onClick={() => setAttachmentToDelete(null)}
        >
          <div
            className="bg-background rounded-xl p-6 shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base mb-1">{t("Delete Attachment")}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {attachmentToDelete.split("/").pop()}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAttachmentToDelete(null)}>
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeAttachment(attachmentToDelete)}
              >
                {t("Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TicketTopHeader({
  ticket,
  ticketId,
  onClose,
}: Readonly<{
  ticket: Card;
  ticketId: string;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const [title, setTitle] = useState(ticket.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const [debouncedTitle] = useDebounce(title, 800);

  const { data: boards } = useBoardsQueries();
  const currentCol = useMemo(() => {
    if (!boards || !ticket.ticketColumnId) return null;
    for (const b of boards) {
      const col = b.ticketColumns?.find((c: any) => c.id === ticket.ticketColumnId);
      if (col) return col;
    }
    return null;
  }, [boards, ticket.ticketColumnId]);

  const { labels } = useLabels(currentCol?.ticketBoardId ?? "");

  const isOverdue = !!(ticket.deadline && new Date(ticket.deadline) < new Date());

  const ticketLabel = labels?.find((l) => l.id === ticket.labelId);
  const labelColor = ticketLabel ? parseColor(ticketLabel.color) : null;

  useEffect(() => {
    if (debouncedTitle !== ticket.title) {
      mutate({ id: ticketId, title: debouncedTitle });
    }
  }, [debouncedTitle, ticketId, mutate, ticket.title]);

  const commitTitle = () => {
    setIsEditingTitle(false);
    if (title !== ticket.title) {
      mutate({ id: ticketId, title });
    }
  };

  const allItems = (ticket.checklists || []).flatMap((cl: any) => cl.items || []);
  const doneItems = allItems.filter((i: any) => i.done).length;
  const totalItems = allItems.length;

  return (
    <div className="border-b border-border flex items-start gap-3 bg-background px-4 py-3 md:px-6 md:pt-4.5 md:pb-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-body text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
            #{ticket.ticketId || ticketId.substring(0, 8)}
          </span>
          {currentCol && (
            <span
              className="inline-flex items-center gap-1 rounded-full font-body text-[11px] font-bold border border-border"
              style={{
                padding: "2px 9px",
                background: "var(--muted)",
                color: "var(--foreground)",
              }}
            >
              <span className="w-1.25 h-1.25 rounded-full bg-primary" />
              {currentCol.title}
            </span>
          )}
          {ticketLabel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full font-body text-[11px] font-bold tracking-wider capitalize"
              style={{
                padding: "2px 9px",
                background: labelColor?.bgcolor,
                color: labelColor?.textcolor,
                border: `1px solid ${labelColor?.bgcolor}`,
              }}
            >
              {ticketLabel.name}
            </span>
          ) : null}
          {isOverdue && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 font-body text-[11px] font-bold border border-red-200"
              style={{ padding: "2px 9px" }}
            >
              <AlertCircle size={11} className="text-red-700" strokeWidth={2} /> {t("Overdue")}
            </span>
          )}
          {totalItems > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full font-body text-[11px] font-semibold"
              style={{
                padding: "2px 9px",
                background: doneItems === totalItems ? "#F0FDF4" : "#F4F5F2",
                color: doneItems === totalItems ? "#15803D" : "#666864",
              }}
            >
              <CheckSquare
                size={11}
                strokeWidth={2}
                style={{
                  color: doneItems === totalItems ? "#16A34A" : "#8B8E8A",
                }}
              />
              {doneItems}/{totalItems}
            </span>
          )}
        </div>

        {isEditingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setIsEditingTitle(false);
                setTitle(ticket.title || "");
              }
            }}
            className="font-display font-extrabold text-base md:text-[21px] text-foreground tracking-tight border-none outline-none w-full bg-transparent"
            style={{
              borderBottom: "2px solid var(--primary)",
              padding: "0 0 2px",
            }}
          />
        ) : (
          <div
            onClick={() => {
              setIsEditingTitle(true);
              setTimeout(() => titleRef.current?.focus(), 20);
            }}
            className="font-display font-extrabold text-base md:text-[21px] text-foreground leading-[1.2] cursor-text tracking-tight hover:opacity-80 transition-opacity"
          >
            {title || t("Untitled Ticket")}
          </div>
        )}
      </div>

      <div className="flex gap-0.5 shrink-0">
        <button
          onClick={onClose}
          className="w-7.5 h-7.5 rounded-[7px] border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-colors hover:bg-muted/50"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}
interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

function SectionLabel({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 mb-3.5">
      {Icon && <Icon size={14} className="text-muted-foreground" strokeWidth={2} />}
      <span className="font-body text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}

function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");

  const commit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  if (!active && !text) {
    return (
      <button
        onClick={() => setActive(true)}
        className="font-body text-xs text-muted-foreground bg-transparent border-none cursor-pointer flex items-center gap-1 rounded-md transition-all duration-150 hover:bg-muted hover:text-primary mt-2"
        style={{ padding: "5px 8px" }}
      >
        <Plus size={11} strokeWidth={2.5} /> {t("Add an item")}
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center mt-2" style={{ padding: "4px 8px" }}>
      <div className="w-[17px] h-[17px] rounded-[5px] border-2 border-muted-foreground/30 shrink-0" />
      <input
        autoFocus={active}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setActive(false);
            setText("");
          }
        }}
        onBlur={() => {
          commit();
          setActive(false);
        }}
        placeholder={t("Add an item...")}
        className="flex-1 font-body text-[13px] border-none border-b-[1.5px] border-b-primary outline-none bg-transparent"
        style={{ padding: "2px 0" }}
      />
      {text && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          className="font-body text-[11px] font-bold text-primary bg-primary/10 border-none rounded-md cursor-pointer"
          style={{ padding: "3px 8px" }}
        >
          {t("Add")}
        </button>
      )}
    </div>
  );
}

function EditTicket({ ticket, ticketId }: Readonly<{ ticket: Card; ticketId: string }>) {
  const { t } = useTranslation();
  const { mutate } = useUpdateCardMutation();
  const [description, setDescription] = useState(ticket.description || "");

  const { data: boards } = useBoardsQueries();
  const currentBoard = (boards || []).find((b) =>
    b.ticketColumns?.some((c: any) => c.id === ticket.ticketColumnId),
  );
  const { labels } = useLabels(currentBoard?.id ?? "");

  const handleLabelChange = (clickedLabelId: string) => {
    const currentLabelIds = ticket.labels?.map((l: any) => l.id) || [];
    const isSelected = currentLabelIds.includes(clickedLabelId);

    const newLabelIds = isSelected
      ? currentLabelIds.filter((id: string) => id !== clickedLabelId)
      : [...currentLabelIds, clickedLabelId];

    mutate({ id: ticketId, labelIds: newLabelIds });
  };

  const [debouncedDescription] = useDebounce(description, 1000);

  useEffect(() => {
    if (debouncedDescription !== ticket.description && debouncedDescription !== "") {
      mutate({ id: ticketId, description: debouncedDescription });
    }
  }, [debouncedDescription, ticketId, mutate, ticket.description]);

  const [localChecklists, setLocalChecklists] = useState<Checklist[]>(ticket.checklists || []);
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newClName, setNewClName] = useState("");

  useEffect(() => {
    if (ticket.checklists) {
      setLocalChecklists(ticket.checklists);
    }
  }, [ticket.checklists]);

  const updateChecklists = (newChecklists: Checklist[]) => {
    setLocalChecklists(newChecklists);
    mutate({ id: ticketId, checklists: newChecklists });
  };

  const addChecklist = () => {
    if (!newClName.trim()) return;
    updateChecklists([
      ...localChecklists,
      { id: crypto.randomUUID(), name: newClName.trim(), items: [] },
    ]);
    setNewClName("");
    setAddingChecklist(false);
  };

  const deleteChecklist = (clId: string) => {
    updateChecklists(localChecklists.filter((cl) => cl.id !== clId));
  };

  const addItem = (clId: string, text: string) => {
    updateChecklists(
      localChecklists.map((cl) =>
        cl.id !== clId
          ? cl
          : {
              ...cl,
              items: [...cl.items, { id: crypto.randomUUID(), text, done: false }],
            },
      ),
    );
  };

  const toggleItem = (clId: string, itemId: string) => {
    updateChecklists(
      localChecklists.map((cl) =>
        cl.id !== clId
          ? cl
          : {
              ...cl,
              items: cl.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
            },
      ),
    );
  };

  const deleteItem = (clId: string, itemId: string) => {
    updateChecklists(
      localChecklists.map((cl) =>
        cl.id !== clId ? cl : { ...cl, items: cl.items.filter((i) => i.id !== itemId) },
      ),
    );
  };

  return (
    <div className="flex flex-col gap-8 shrink-0">
      {/* Description Editor */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-body text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
            {t("Description")}
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Add a description...")}
          className="min-h-20 bg-muted/30 resize-y"
        />
      </div>

      {/* Labels */}
      <div>
        <SectionLabel label={t("Labels")} icon={Tag} />
        <div className="mt-[9px] flex flex-wrap items-center gap-1.5">
          {ticket.labels?.map((label: any) => {
            const pColor = parseColor(label.color);
            return (
              <button
                key={label.id}
                onClick={() => handleLabelChange(label.id)}
                className="rounded-full flex items-center gap-[3px] cursor-pointer transition-all duration-150 hover:opacity-80 group border-none px-3 py-0.5"
                style={{
                  background: pColor.bgcolor,
                  color: pColor.textcolor,
                }}
              >
                <span className="text-xs">{label.name}</span>
                <X size={11} className="opacity-50 group-hover:opacity-100" strokeWidth={2.5} />
              </button>
            );
          })}

          <Popover>
            <PopoverTrigger
              render={
                <button className="flex items-center gap-[3px] px-3 py-0.5 rounded-full border-[1.5px] border-dashed border-muted-foreground/60 bg-transparent font-body text-[11px] font-semibold text-muted-foreground/80 transition-all duration-150 hover:border-primary hover:text-primary cursor-pointer" />
              }
            >
              <Plus size={10} strokeWidth={2.5} />
              <span className="text-xs">{t("Add label")}</span>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-2 px-1 mt-1">
                {t("Board Labels")}
              </div>
              <div
                className="max-h-64 overflow-y-auto flex flex-col gap-1"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {!labels || labels.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center p-2">
                    {t("No labels found on this board.")}
                  </div>
                ) : (
                  labels.map((label) => {
                    const isSelected = ticket.labels?.some((l: any) => l.id === label.id);
                    const pColor = parseColor(label.color);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleLabelChange(label.id)}
                        className="rounded-md flex items-center justify-between px-2.5 py-1.5 transition cursor-pointer text-left w-full text-[11.5px] font-semibold hover:opacity-80 border-none"
                        style={{
                          background: pColor.bgcolor,
                          color: pColor.textcolor,
                        }}
                      >
                        {label.name}
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Checklists */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <SectionLabel label={t("Checklists")} icon={CheckSquare} />
          <button
            onClick={() => setAddingChecklist(true)}
            className="font-body text-xs font-semibold text-primary bg-primary/10 border-none rounded-md cursor-pointer flex items-center gap-1 transition-colors hover:bg-primary/20"
            style={{ padding: "4px 10px" }}
          >
            <Plus size={12} strokeWidth={2.5} /> {t("Add checklist")}
          </button>
        </div>

        {localChecklists.length === 0 && !addingChecklist && (
          <div className="p-3.5 bg-muted/30 rounded-lg border-[1.5px] border-dashed border-border font-body text-[13px] text-muted-foreground text-center">
            {t("No checklists yet — add one above")}
          </div>
        )}

        {localChecklists.map((cl, clIdx) => {
          const clDone = cl.items.filter((i) => i.done).length;
          const clTotal = cl.items.length;
          const pct = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;

          return (
            <div
              key={cl.id}
              className="bg-ink-25 dark:bg-muted/20 rounded-[10px] border border-border p-3.5"
              style={{
                marginBottom: clIdx < localChecklists.length - 1 ? 20 : 8,
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: clTotal > 0 ? 8 : 10 }}
              >
                <CheckSquare size={14} className="text-muted-foreground" strokeWidth={2} />
                <span className="font-body font-bold text-[13px] text-foreground flex-1">
                  {cl.name}
                </span>
                {clTotal > 0 && (
                  <span
                    className={`font-body text-[11px] font-semibold ${clDone === clTotal ? "text-green-600" : "text-muted-foreground"}`}
                  >
                    {pct}%
                  </span>
                )}
                <button
                  onClick={() => deleteChecklist(cl.id)}
                  className="w-[22px] h-[22px] rounded-[5px] border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </div>

              {clTotal > 0 && (
                <div className="h-1 bg-border rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${clDone === clTotal ? "bg-green-600" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-px">
                {cl.items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-[7px] transition-colors duration-150 hover:bg-muted/50 relative"
                    style={{ padding: "5px 8px" }}
                  >
                    <div
                      onClick={() => toggleItem(cl.id, item.id)}
                      className={`w-[17px] h-[17px] rounded-[5px] shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${item.done ? "bg-green-600 border-none" : "bg-transparent border-2 border-border"}`}
                    >
                      {item.done && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span
                      onClick={() => toggleItem(cl.id, item.id)}
                      className="font-body text-[13px] flex-1 cursor-pointer transition-all duration-150"
                      style={{
                        color: item.done ? "var(--muted-foreground)" : "var(--foreground)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteItem(cl.id, item.id)}
                      className="w-[18px] h-[18px] rounded border-none bg-transparent text-muted-foreground cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 hover:text-destructive"
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              <AddItemRow onAdd={(text) => addItem(cl.id, text)} />
            </div>
          );
        })}

        {addingChecklist && (
          <div
            className="flex gap-2 items-center bg-primary/5 rounded-[10px] border-[1.5px] border-primary/20 mt-2"
            style={{ padding: "10px 14px" }}
          >
            <CheckSquare size={14} className="text-primary" strokeWidth={2} />
            <input
              autoFocus
              value={newClName}
              onChange={(e) => setNewClName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addChecklist();
                if (e.key === "Escape") {
                  setAddingChecklist(false);
                  setNewClName("");
                }
              }}
              placeholder={t("Checklist name...")}
              className="flex-1 font-body text-[13px] font-semibold border-none outline-none bg-transparent text-foreground"
            />
            <button
              onClick={addChecklist}
              disabled={!newClName.trim()}
              className="font-body text-[13px] font-semibold text-primary-foreground bg-primary border-none rounded-[7px] cursor-pointer disabled:opacity-45"
              style={{ padding: "7px 13px" }}
            >
              {t("Add")}
            </button>
            <button
              onClick={() => {
                setAddingChecklist(false);
                setNewClName("");
              }}
              className="font-body text-[13px] font-semibold text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground"
              style={{ padding: "7px 13px" }}
            >
              {t("Cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketComments({
  data,
  ticketCardId,
}: Readonly<{
  data: Array<TicketComment>;
  ticketCardId: string;
}>) {
  const { t } = useTranslation();
  const { mutate } = useCreateCommentMutation(ticketCardId);
  const handleAddComment = (comment: string) => {
    mutate({ msg: comment, ticketCardId });
  };
  return (
    <div className="flex flex-col gap-6 mt-1">
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
        <AvatarImage src={data?.createdBy?.profilePhoto ?? ""} />
        <AvatarFallback>{data?.createdBy?.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold capitalize">{data.createdBy?.name}</span>
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

function TicketActivity({ activities }: Readonly<{ activities: Array<Activity> }>) {
  const { t } = useTranslation();
  if (!activities || activities.length === 0)
    return <div className="text-sm text-muted-foreground p-4">{t("No activity yet.")}</div>;

  return (
    <div className="flex flex-col gap-4 mt-1 relative before:absolute before:inset-y-0 before:left-3.75 before:w-0.5 before:bg-border">
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
          case "REMOVED_MEMBER":
            title = `${activity.user?.name} removed ${activity.details?.memberName || "someone"} from this card`;
            IconCmp = UserMinus;
            break;
          case "ADDED_CONTACT":
            title = `${activity.user?.name} added contact ${activity.details?.contactName || "someone"} to this card`;
            IconCmp = UserPlus;
            break;
          case "REMOVED_CONTACT":
            title = `${activity.user?.name} removed contact ${activity.details?.contactName || "someone"} from this card`;
            IconCmp = UserMinus;
            break;
          case "ADDED_ATTACHMENT":
            title = `${activity.user?.name} added attachment ${activity.details?.key?.split("/").pop() || "file"}`;
            IconCmp = Paperclip;
            break;
          case "REMOVED_ATTACHMENT":
            title = `${activity.user?.name} removed attachment ${activity.details?.key?.split("/").pop() || "file"}`;
            IconCmp = Trash2;
            break;
          case "CHANGED_PRIORITY":
            title = `${activity.user?.name} changed priority from ${activity.details?.fromPriority || "None"} to ${activity.details?.toPriority}`;
            IconCmp = AlertCircle;
            break;
          case "ADDED_CHECKLIST":
            title = `${activity.user?.name} added checklist ${activity.details?.checklistName}`;
            IconCmp = CheckSquare;
            break;
          case "REMOVED_CHECKLIST":
            title = `${activity.user?.name} removed checklist ${activity.details?.checklistName}`;
            IconCmp = Trash2;
            break;
          case "ADDED_CHECKLIST_ITEM":
            title = `${activity.user?.name} added item ${activity.details?.itemName} to checklist ${activity.details?.checklistName}`;
            IconCmp = Plus;
            break;
          case "REMOVED_CHECKLIST_ITEM":
            title = `${activity.user?.name} removed item ${activity.details?.itemName} from checklist ${activity.details?.checklistName}`;
            IconCmp = Trash;
            break;
          case "CHECKED_CHECKLIST_ITEM":
            title = `${activity.user?.name} completed ${activity.details?.itemName} in checklist ${activity.details?.checklistName}`;
            IconCmp = Check;
            break;
          case "UNCHECKED_CHECKLIST_ITEM":
            title = `${activity.user?.name} unchecked ${activity.details?.itemName} in checklist ${activity.details?.checklistName}`;
            IconCmp = X;
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
              const question = surveyResponse?.surveyTeamMap?.survey?.questions?.find(
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
                  surveyResponse?.responses?.find((res: any) => res.questionId === question.id)
                    ?.response,
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
              <span className="text-sm font-semibold">{response?.contact?.name}</span>
              <span className="text-xs text-muted-foreground">{response?.contact?.phone}</span>
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
