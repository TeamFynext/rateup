"use client";

import { useEffect, useState } from "react";

import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { List, NotebookTabs, Sparkles, Ticket, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useTeamMembersFromInvitation } from "@/backend/team/team.query";
import {
  useBoard,
  useBoardQueries,
  useCreateTicketMutation,
} from "@/backend/tickets/tickets.query";
import { TicketType } from "@/utils/enums/ticket.ts";

import { TeamSelector } from "../input/TeamSelector.tsx";
import FormModalLayout from "../Modal/FormModalLayout.tsx";
import Loading from "../Page/Loading.tsx";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import { Textarea } from "../ui/textarea.tsx";

interface iProps {
  createTicketOpened: boolean;
  closeTicketModal: any;
  selectedTeamId: string;
  type: string;
  rid?: string;
  surveyResponseId?: string;
}

const CreateTicketModal = ({
  createTicketOpened,
  closeTicketModal,
  selectedTeamId,
  type,
  rid,
  surveyResponseId,
}: iProps) => {
  const isCustomTicket = type === TicketType.CUSTOM;
  const { t: translations } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title:
      type === TicketType.REVIEW
        ? translations("Review Ticket")
        : isCustomTicket
          ? ""
          : translations("Survey Response Ticket"),
    type:
      type === TicketType.REVIEW
        ? TicketType.REVIEW
        : isCustomTicket
          ? TicketType.CUSTOM
          : TicketType.SURVEY_RESPONSE,
    firstComment: "",
    assignedToId: "",
    priority: "",
    teamId: selectedTeamId,
    deadline: "",
    reviewId: type === TicketType.REVIEW ? rid : "",
    surveyResponseId:
      type === TicketType.SURVEY_RESPONSE ? surveyResponseId : "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    isLoading: isLoadingMembers,
    data: teamsMembersData,
    refetch: refetchInvitedTeamMembers,
  } = useTeamMembersFromInvitation(
    selectedTeamId || formData.teamId,
  ) as UseTeamResult;

  const memberOptions = teamsMembersData?.members?.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  useEffect(() => {
    if (rid) setFormData((prev) => ({ ...prev, reviewId: rid }));
  }, [rid]);

  useEffect(() => {
    if (selectedTeamId)
      setFormData((prev) => ({ ...prev, teamId: selectedTeamId }));
  }, [selectedTeamId, createTicketOpened]);

  useEffect(() => {
    if (surveyResponseId)
      setFormData((prev) => ({ ...prev, surveyResponseId }));
  }, [surveyResponseId]);

  const createTicket = useCreateTicketMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = translations("Cannot be empty");
    if (formData.firstComment.trim().split(" ").length < 2)
      newErrors.firstComment = translations("Minimum 2 words required");
    if (!formData.assignedToId)
      newErrors.assignedToId = translations("Team staff selection is required");
    if (!formData.priority)
      newErrors.priority = translations("Priority selection is required");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;

    toast.loading(translations("Hold on, your ticket is getting created..."), {
      id: "load-data",
    });

    createTicket.mutate(formData, {
      onSuccess: (res) => {
        if (res.id) {
          closeAll();
        }
      },
    });
  };

  function closeAll() {
    setFormData({
      title: "",
      type: TicketType.CUSTOM,
      firstComment: "",
      assignedToId: "",
      priority: "",
      teamId: selectedTeamId,
      deadline: "",
      reviewId: "",
      surveyResponseId: "",
    });
    setErrors({});
    closeTicketModal();
  }

  return (
    <FormModalLayout
      opened={createTicketOpened}
      onClose={closeAll}
      title={translations("Create Ticket")}
      centered
      size="xl"
    >
      <div className="flex flex-col gap-4 mt-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 space-y-1">
            <Label>
              {translations("Name:")} <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder={translations("Enter Ticket Name")}
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {isCustomTicket && (
            <div className="flex-1 space-y-1 min-w-[32%]">
              <Label>
                {translations("Select Team")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <TeamSelector
                value={formData.teamId}
                onChange={(teamId) => setFormData({ ...formData, teamId })}
                enableAll={false}
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>
            {isCustomTicket
              ? translations("Description")
              : translations("Comment")}
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            placeholder={
              isCustomTicket
                ? translations("Enter description")
                : translations("Enter Comment")
            }
            rows={4}
            value={formData.firstComment}
            onChange={(e) =>
              setFormData({ ...formData, firstComment: e.target.value })
            }
          />
          {errors.firstComment && (
            <p className="text-xs text-red-500">{errors.firstComment}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 space-y-1 min-w-[30%]">
            <Label>
              {translations("Assign to")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.assignedToId}
              onValueChange={(val) =>
                setFormData({ ...formData, assignedToId: val })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={translations("Select a team staff")}
                />
              </SelectTrigger>
              <SelectContent>
                {memberOptions?.map((member) => (
                  <SelectItem key={member.value} value={member.value}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedToId && (
              <p className="text-xs text-red-500">{errors.assignedToId}</p>
            )}
          </div>

          <div className="flex-1 space-y-1 min-w-[30%]">
            <Label>
              {translations("Priority")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(val) =>
                setFormData({ ...formData, priority: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={translations("Select priority")} />
              </SelectTrigger>
              <SelectContent>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((prio) => (
                  <SelectItem key={prio} value={prio}>
                    {prio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-xs text-red-500">{errors.priority}</p>
            )}
          </div>

          <div className="flex-1 space-y-1 min-w-[30%]">
            <Label>{translations("Deadline:")}</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
              }
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-2">
          <Button className="mt-6" variant="outline" onClick={closeAll}>
            {translations("Cancel")}
          </Button>

          <Button className="mt-6" onClick={onSubmit}>
            <IconPlus className="mr-2 h-4 w-4" />
            {translations("Create")}
          </Button>
        </div>
      </div>
    </FormModalLayout>
  );
};

export const CreateTicketCard = ({
  opened,
  close,
  type,
  hasTicketFeature,
  contactId,
}: any) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const { boards, isLoading: isBoardsLoading } =
    useBoardQueries(hasTicketFeature);
  const { createCard, board, isLoading } = useBoard(selectedBoardId);

  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    ticketColumnId: "",
    title: "",
    description: "",
    type,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ticketColumnId) newErrors.ticketColumnId = "required";
    if (!formData.title) newErrors.title = "required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    createCard(
      { ...formData, contactId },
      {
        onSuccess: () => {
          setSubmitting(false);
          cancel();
        },
      },
    );
  }

  function cancel() {
    setFormData({
      ticketColumnId: "",
      title: "",
      description: "",
      type,
    });
    setErrors({});
    close();
  }

  return (
    <Dialog open={opened} onOpenChange={cancel}>
      <DialogContent className="p-0">
        <DialogHeader className="p-0">
          <DialogTitle className="p-0">
            <div className="flex items-center justify-start gap-2 bg-primary rounded-t-lg py-6 px-4">
              <div className="bg-white/40 p-2 rounded-md text-white">
                <Ticket />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Create Ticket
              </h1>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isBoardsLoading || isLoading ? (
          <div className="min-h-[60vh] w-full">
            <Loading />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="w-full p-4 flex flex-col gap-4 justify-center"
          >
            {/* Select Board */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-orange-100 text-orange-600 p-1 rounded-sm">
                  <List size={14} />
                </div>
                <div>
                  {t("Select Board")}
                  <span className="text-red-500">*</span>
                </div>
              </Label>

              <Select
                value={selectedBoardId}
                onValueChange={(val) => {
                  setSelectedBoardId(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select Board")} />
                </SelectTrigger>

                <SelectContent>
                  {boards?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select List */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-blue-100 text-blue-600 p-1 rounded-sm">
                  <Sparkles size={14} />
                </div>
                <div>
                  {t("Select List")}
                  <span className="text-red-500">*</span>
                </div>
              </Label>

              <Select
                value={formData.ticketColumnId}
                onValueChange={(val) =>
                  setFormData({ ...formData, ticketColumnId: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select List")} />
                </SelectTrigger>

                <SelectContent>
                  {board?.ticketColumns?.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.ticketColumnId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.ticketColumnId}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-purple-100 text-purple-600 p-1 rounded-sm">
                  <Type size={14} />
                </div>
                <div>
                  {t("Title")} <span className="text-red-500">*</span>
                </div>
              </Label>

              <Input
                placeholder={t("Enter ticket title")}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-green-100 text-green-600 p-1 rounded-sm">
                  <NotebookTabs size={14} />
                </div>
                <div>
                  {t("Description")}
                  <span className="text-red-500">*</span>
                </div>
              </Label>

              <Textarea
                placeholder={t("Provide detailed information about the ticket")}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="w-full flex justify-end items-center gap-4">
              <Button type="button" onClick={cancel} variant="outline">
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("Creating") : t("Create Ticket")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateTicketModal;
