import { LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useBoard,
  useBoardQueries,
  useLabels,
  useBoardTeamMembersById,
} from "@/backend/tickets/tickets.query";
import { cn } from "@/lib/utils";

import Loading from "../Page/Loading.tsx";
import { Button } from "../ui/button.tsx";
import { CreativeAvatar } from "../ui/creative-avatar.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Textarea } from "../ui/textarea.tsx";

interface CreateTicketProps {
  createTicketOpened: boolean;
  closeTicketModal: any;
  type: string;
  surveyResponseId?: string;
  rid?: string;
  hasTicketFeature?: boolean;
  contactId?: string;
}

const CreateTicketModal = ({
  createTicketOpened,
  closeTicketModal,
  type,
  rid,
  surveyResponseId,
  hasTicketFeature = true,
  contactId,
}: CreateTicketProps) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const { boards, isLoading: isBoardsLoading } = useBoardQueries(hasTicketFeature);
  const { createCard, board, isLoading } = useBoard(selectedBoardId);
  const { labels } = useLabels(selectedBoardId);
  const { data: members = [] } = useBoardTeamMembersById(selectedBoardId);

  const [formData, setFormData] = useState({
    ticketColumnId: "",
    title:
      type === "REVIEW"
        ? t("Review Ticket")
        : type === "SURVEY_RESPONSE"
          ? t("Survey Response Ticket")
          : "",
    description: "",
    deadline: "",
    type,
    labelIds: [] as string[],
    assigneeId: null as string | null,
    reviewId: rid,
    surveyResponseId: surveyResponseId,
  });

  // Keep first board selected if none is
  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  // Keep first column selected if none is selected
  useEffect(() => {
    setFormData((prev) => {
      const newColId = board?.ticketColumns?.length > 0 ? board.ticketColumns[0].id : "";
      if (prev.ticketColumnId !== newColId && newColId) {
        return { ...prev, ticketColumnId: newColId };
      }
      return prev;
    });
  }, [board]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      reviewId: rid,
      title: type === "REVIEW" && !prev.title ? t("Review Ticket") : prev.title,
    }));
  }, [rid, type, t]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      surveyResponseId,
      title: type === "SURVEY_RESPONSE" && !prev.title ? t("Survey Response Ticket") : prev.title,
    }));
  }, [surveyResponseId, type, t]);

  useEffect(() => {
    setFormData((prev) => {
      const newLabelIds = labels?.length > 0 && prev.labelIds.length === 0 ? [] : prev.labelIds;
      if (prev.labelIds !== newLabelIds) {
        return { ...prev, labelIds: newLabelIds };
      }
      return prev;
    });
  }, [labels]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const canSubmit = Boolean(selectedBoardId && formData.title.trim() && formData.ticketColumnId);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ticketColumnId) newErrors.ticketColumnId = t("Cannot be empty");
    if (!formData.title.trim()) newErrors.title = t("Cannot be empty");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleLabel = (labelId: string) =>
    setFormData((prev) => ({
      ...prev,
      labelIds: prev.labelIds.includes(labelId)
        ? prev.labelIds.filter((id) => id !== labelId)
        : [...prev.labelIds, labelId],
    }));

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const payload: any = {
      ...formData,
      title: formData.title.trim(),
      contactId,
    };
    if (!payload.deadline) {
      delete payload.deadline;
    }
    if (!payload.labelIds || payload.labelIds.length === 0) {
      delete payload.labelIds;
    }
    if (payload.assigneeId) {
      payload.assignees = [{ assigneeId: payload.assigneeId }];
    }
    delete payload.assigneeId;

    createCard(payload, {
      onSuccess: () => {
        setSubmitting(false);
        cancel();
      },
      onError: () => {
        setSubmitting(false);
      },
    });
  }

  function cancel() {
    setFormData({
      ticketColumnId: "",
      title: "",
      description: "",
      deadline: "",
      type,
      labelIds: [],
      assigneeId: null,
      reviewId: rid,
      surveyResponseId: surveyResponseId,
    });
    setErrors({});
    closeTicketModal();
  }

  const assignedMember = members.find((m: any) => m.id === formData.assigneeId);

  return (
    <Dialog open={createTicketOpened} onOpenChange={(val) => !val && cancel()}>
      <DialogContent className="p-0 gap-0">
        <DialogHeader>
          <div className="flex items-center gap-2 p-5 pb-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <LayoutDashboard className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            </div>
            <DialogTitle className="font-bold text-base">{t("Create Ticket")}</DialogTitle>
          </div>
        </DialogHeader>

        {isBoardsLoading || isLoading ? (
          <div className="min-h-[60vh] w-full flex items-center justify-center">
            <Loading />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-5 py-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Board */}
            <div className="space-y-1">
              <Label
                htmlFor="ticket-board"
                className="text-xs font-medium uppercase text-muted-foreground"
              >
                {t("Board")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedBoardId}
                onValueChange={(val) => setSelectedBoardId(val)}
                items={boards?.map((b: any) => ({ value: b.id, label: b.title })) ?? []}
              >
                <SelectTrigger id="ticket-board" className="cursor-pointer h-9 w-full">
                  <SelectValue placeholder={t("Select a board")} />
                </SelectTrigger>
                <SelectContent>
                  {boards?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label
                htmlFor="ticket-title"
                className="text-xs font-medium uppercase text-muted-foreground"
              >
                {t("Title")} <span className="text-destructive normal-case">*</span>
              </Label>
              <Input
                id="ticket-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("Short description of the issue…")}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="h-9"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label
                htmlFor="ticket-description"
                className="text-xs font-medium uppercase text-muted-foreground"
              >
                {t("Description")}
              </Label>
              <Textarea
                id="ticket-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("Add more context…")}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                {t("Assignee")}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {members.map((s: any) => {
                  const on = formData.assigneeId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      title={s.name}
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, assigneeId: on ? null : s.id });
                      }}
                      className="cursor-pointer rounded-full p-0 outline-offset-2 transition-[outline-color] duration-150"
                      style={{
                        outline: `3px solid ${on ? "#3b82f6" : "transparent"}`,
                      }}
                    >
                      <CreativeAvatar name={s.name} src={s.profilePhoto} size="sm" />
                    </button>
                  );
                })}
                {assignedMember && (
                  <span className="text-muted-foreground text-xs">{assignedMember.name}</span>
                )}
              </div>
            </div>

            {/* Labels */}
            {labels && labels.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-muted-foreground">
                  {t("Labels")}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l: any) => {
                    const on = formData.labelIds.includes(l.id);
                    let tc = { bg: "#f3f4f6", textcolor: "#374151" };
                    try {
                      const parsed = JSON.parse(l.color);
                      if (parsed && parsed.bgcolor)
                        tc = { bg: parsed.bgcolor, textcolor: parsed.textcolor };
                    } catch {
                      tc = { bg: l.color, textcolor: "#171717" };
                    }

                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleLabel(l.id);
                        }}
                        className={cn(
                          "cursor-pointer rounded-full px-2.5 py-[3px] text-[11px] font-semibold transition-all duration-150",
                          !on &&
                            "bg-muted text-foreground border-[1.5px] border-transparent opacity-60",
                        )}
                        style={
                          on
                            ? {
                                background: tc.bg,
                                color: tc.textcolor,
                                border: `1.5px solid ${tc.textcolor}44`,
                              }
                            : undefined
                        }
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="p-4 border-t">
          <Button variant="ghost" size="sm" onClick={cancel}>
            {t("Cancel")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? t("Creating") : t("Create Ticket")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CreateTicketCard = ({ opened, close, type, hasTicketFeature, contactId }: any) => {
  return (
    <CreateTicketModal
      createTicketOpened={opened}
      closeTicketModal={close}
      type={type}
      hasTicketFeature={hasTicketFeature}
      contactId={contactId}
    />
  );
};

export default CreateTicketModal;
