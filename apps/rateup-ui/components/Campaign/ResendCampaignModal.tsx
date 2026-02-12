"use client";

import { useState } from "react";

import { AlertCircle, Calendar, CalendarIcon, Clock, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { CampaignParticipantStatus } from "@/types/enums";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export interface ResendOptions {
  sendMode: "NOW" | "SCHEDULED";
  scheduleDate?: string;
  scheduleTime?: string;
  statuses: CampaignParticipantStatus[];
}

interface ResendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: ResendOptions) => void;
  isLoading?: boolean;
  stats?: Record<string, number | undefined>;
}

const STATUS_OPTIONS = [
  {
    value: CampaignParticipantStatus.FAILED,
    labelKey: "statuses.FAILED",
    color: "text-red-600",
  },
  {
    value: CampaignParticipantStatus.PENDING,
    labelKey: "statuses.PENDING",
    color: "text-yellow-600",
  },
  {
    value: CampaignParticipantStatus.SENT,
    labelKey: "statuses.SENT",
    color: "text-blue-600",
  },
  {
    value: CampaignParticipantStatus.DELIVERED,
    labelKey: "statuses.DELIVERED",
    color: "text-green-600",
  },
  {
    value: CampaignParticipantStatus.READ,
    labelKey: "statuses.READ",
    color: "text-purple-600",
  },
  {
    value: CampaignParticipantStatus.COMPLETED,
    labelKey: "statuses.COMPLETED",
    color: "text-emerald-600",
  },
];

export const ResendCampaignModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  stats = {},
}: ResendCampaignModalProps) => {
  const t = useTranslations("campaign.resend");

  // ✅ OLD UI parity: default FAILED
  const [selectedStatuses, setSelectedStatuses] = useState<
    CampaignParticipantStatus[]
  >([CampaignParticipantStatus.FAILED]);

  const [sendMode, setSendMode] = useState<"NOW" | "SCHEDULED">("NOW");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const toggleStatus = (status: CampaignParticipantStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const getToday = () => new Date().toISOString().split("T")[0];

  const getStatusCount = (status: CampaignParticipantStatus) => {
    const map: Record<CampaignParticipantStatus, string> = {
      FAILED: "failed",
      PENDING: "pending",
      SENT: "sent",
      DELIVERED: "delivered",
      READ: "read",
      COMPLETED: "completed",
    };
    return stats?.[map[status]] ?? 0;
  };

  const handleSubmit = () => {
    if (selectedStatuses.length === 0) {
      toast.error(t("errors.selectStatus"));
      return;
    }

    if (sendMode === "SCHEDULED" && (!scheduleDate || !scheduleTime)) {
      toast.error(t("errors.selectDateTime"));
      return;
    }

    onSubmit({
      sendMode,
      scheduleDate: sendMode === "SCHEDULED" ? scheduleDate : undefined,
      scheduleTime: sendMode === "SCHEDULED" ? scheduleTime : undefined,
      statuses: selectedStatuses,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SEND MODE */}
          <div className="space-y-3">
            <Label className="font-semibold">{t("sendMode.label")}</Label>
            <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-0.5">
              <ToggleGroup
                type="single"
                value={sendMode}
                onValueChange={(v) => v && setSendMode(v as any)}
                className="gap-0"
              >
                <ToggleGroupItem
                  value="NOW"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm data-[state=on]:text-slate-900 dark:data-[state=on]:text-slate-50 text-slate-500 dark:text-slate-400 transition-all duration-200 border-0 h-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("sendMode.now")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="SCHEDULED"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm data-[state=on]:text-slate-900 dark:data-[state=on]:text-slate-50 text-slate-500 dark:text-slate-400 transition-all duration-200 border-0 h-auto"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {t("sendMode.scheduled")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {sendMode === "SCHEDULED" && (
              <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
                {/* Date */}
                <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background hover:shadow-sm transition-all cursor-pointer">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {scheduleDate || t("sendMode.date")}
                  </span>
                  <Input
                    type="date"
                    min={getToday()}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>

                <div className="w-px h-4 bg-border" />

                {/* Time */}
                <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background hover:shadow-sm transition-all cursor-pointer">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {scheduleTime || t("sendMode.time")}
                  </span>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STATUS SELECTION */}
          <div className="space-y-2">
            <Label className="font-semibold">
              {t("participantStatus.label")}
            </Label>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleStatus(opt.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer
            ${isSelected ? "border-transparent bg-muted shadow-sm" : "border-border bg-transparent opacity-50 hover:opacity-80"}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${opt.color.replace("text-", "bg-")}`}
                    />
                    <span className={opt.color}>{t(opt.labelKey)}</span>
                    <span className="text-xs text-muted-foreground">
                      {getStatusCount(opt.value)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedStatuses.length === 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                {t("participantStatus.required")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selectedStatuses.length === 0}
          >
            {isLoading ? t("actions.sending") : t("actions.resend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
