// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Paperclip, Plus, Trash2, X, ZoomIn } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useBoardsQueries,
  useCardTeamMembersById,
  useUpdateCardMutation,
} from "@/backend/tickets/tickets.query";
import { getUserColor } from "@/components/Tickets/BoardContent";
import type { Card } from "@/components/Tickets/types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FieldTitle } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteUploadedFiles, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { AssignContact } from "./AssignContact.tsx";
import { DateRow, MetaLabel, useDeleteCardMutation, useMoveCardColumnMutation } from "./shared.tsx";

export function RightSidebar({
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
    b.ticketColumns?.some((c) => c.id === ticket.ticketColumnId),
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
                items={boardColumns.map((col) => ({ value: col.id, label: col.title }))}
              >
                <SelectTrigger className="w-full h-9 text-[13px] font-body">
                  <SelectValue placeholder={t("Select column")} />
                </SelectTrigger>
                <SelectContent>
                  {boardColumns.map((col) => (
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
                  to="/dashboard/inbox"
                  search={{ tab: "All", contactId: linkedContact.id }}
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
