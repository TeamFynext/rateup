import { Calendar, Tag, List, NotebookTabs, Sparkles, Ticket, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBoard, useBoardQueries, useLabels } from "@/backend/tickets/tickets.query";

import Loading from "../Page/Loading.tsx";
import { Button } from "../ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Textarea } from "../ui/textarea.tsx";

interface CreateTicketProps {
  createTicketOpened: boolean;
  closeTicketModal: any;
  type: string;
  surveyResponseId?: string;
  rid?: string;
}

const CreateTicketModal = ({
  createTicketOpened,
  closeTicketModal,
  type,
  rid,
  surveyResponseId,
}: CreateTicketProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  // Pass true to hasTicketFeature since we are directly showing the modal in parts of the app that assume feature access.
  // Alternatively, the caller could pass it down, but default to true if it isn't passed for backwards compatibility.
  const { boards, isLoading: isBoardsLoading } = useBoardQueries(true);
  const { createCard, board, isLoading } = useBoard(selectedBoardId);
  const { labels } = useLabels(selectedBoardId);

  const { t } = useTranslation();

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
    reviewId: rid,
    surveyResponseId: surveyResponseId,
  });

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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ticketColumnId) newErrors.ticketColumnId = t("Cannot be empty");
    if (!formData.title) newErrors.title = t("Cannot be empty");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const payload: any = { ...formData };
    if (!payload.deadline) {
      delete payload.deadline;
    }
    if (!payload.labelIds || payload.labelIds.length === 0) {
      delete payload.labelIds;
    }

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
      reviewId: rid,
      surveyResponseId: surveyResponseId,
    });
    setErrors({});
    closeTicketModal();
  }

  return (
    <Dialog open={createTicketOpened} onOpenChange={cancel}>
      <DialogContent className="p-0">
        <DialogHeader className="p-0">
          <DialogTitle className="p-0">
            <div className="flex items-center justify-start gap-2 bg-primary rounded-t-lg py-6 px-4">
              <div className="bg-white/40 p-2 rounded-md text-white">
                <Ticket />
              </div>
              <h1 className="text-xl font-semibold text-white">{t("Create Ticket")}</h1>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isBoardsLoading || isLoading ? (
          <div className="min-h-[60vh] w-full">
            <Loading />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full p-4 flex flex-col gap-4 justify-center">
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
            {type !== "SURVEY_RESPONSE" && (
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
                  onValueChange={(val) => setFormData({ ...formData, ticketColumnId: val })}
                  disabled={!selectedBoardId}
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
                  <p className="text-xs text-red-500 mt-1">{errors.ticketColumnId}</p>
                )}
              </div>
            )}

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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-green-100 text-green-600 p-1 rounded-sm">
                  <NotebookTabs size={14} />
                </div>
                <div>{t("Description")}</div>
              </Label>

              <Textarea
                placeholder={t("Provide detailed information about the ticket")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Labels */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-yellow-100 text-yellow-600 p-1 rounded-sm">
                  <Tag size={14} />
                </div>
                <div>{t("Labels")}</div>
              </Label>

              <MultiSelect
                options={
                  labels?.map((label: any) => ({ label: label.name, value: label.id })) || []
                }
                onValueChange={(val) => setFormData({ ...formData, labelIds: val })}
                defaultValue={formData.labelIds}
                placeholder={t("Select Labels")}
                disabled={!selectedBoardId}
                maxCount={3}
              />
            </div>

            {/* Due Date */}
            {type !== "SURVEY_RESPONSE" && (
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="bg-red-100 text-red-600 p-1 rounded-sm">
                    <Calendar size={14} />
                  </div>
                  <div>{t("Due Date")}</div>
                </Label>

                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  onClick={(e) => "showPicker" in e.target && (e.target as any).showPicker()}
                />
              </div>
            )}

            <div className="w-full flex justify-end items-center gap-4 mt-2">
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

export const CreateTicketCard = ({ opened, close, type, hasTicketFeature, contactId }: any) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const { boards, isLoading: isBoardsLoading } = useBoardQueries(hasTicketFeature);
  const { createCard, board, isLoading } = useBoard(selectedBoardId);
  const { labels } = useLabels(selectedBoardId);

  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    ticketColumnId: "",
    title: "",
    description: "",
    deadline: "",
    type,
    labelIds: [] as string[],
  });

  useEffect(() => {
    setFormData((prev) => {
      const newColId = board?.ticketColumns?.length > 0 ? board.ticketColumns[0].id : "";
      if (prev.ticketColumnId !== newColId) {
        return { ...prev, ticketColumnId: newColId };
      }
      return prev;
    });
  }, [board]);

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

    const payload: any = { ...formData, contactId };
    if (!payload.deadline) {
      delete payload.deadline;
    }
    if (!payload.labelIds || payload.labelIds.length === 0) {
      delete payload.labelIds;
    }

    createCard(payload, {
      onSuccess: () => {
        setSubmitting(false);
        cancel();
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
              <h1 className="text-xl font-semibold text-white">Create Ticket</h1>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isBoardsLoading || isLoading ? (
          <div className="min-h-[60vh] w-full">
            <Loading />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full p-4 flex flex-col gap-4 justify-center">
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-green-100 text-green-600 p-1 rounded-sm">
                  <NotebookTabs size={14} />
                </div>
                <div>{t("Description")}</div>
              </Label>

              <Textarea
                placeholder={t("Provide detailed information about the ticket")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Labels */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="bg-yellow-100 text-yellow-600 p-1 rounded-sm">
                  <Tag size={14} />
                </div>
                <div>{t("Labels")}</div>
              </Label>

              <MultiSelect
                options={
                  labels?.map((label: any) => ({ label: label.name, value: label.id })) || []
                }
                onValueChange={(val) => setFormData({ ...formData, labelIds: val })}
                defaultValue={formData.labelIds}
                placeholder={t("Select Labels")}
                disabled={!selectedBoardId}
                maxCount={3}
              />
            </div>

            <div className="w-full flex justify-end items-center gap-4 mt-2">
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
