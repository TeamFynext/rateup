"use client";

import { useState } from "react";

import dayjs from "dayjs";
import {
  AlertCircle,
  CalendarIcon,
  ChevronDownIcon,
  Clock,
  Send,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CampaignParticipantStatus } from "@/types/enums.ts";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.tsx";

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
  isFirstSend?: boolean;
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
    color: "text-yellow-500",
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
  isFirstSend = false,
}: ResendCampaignModalProps) => {
  const { t } = useTranslation("campaign.resend");
  const getToday = () => new Date().toISOString().split("T")[0];
  const [scheduleDate, setScheduleDate] = useState(getToday());
  const [scheduleTime, setScheduleTime] = useState("09:00");

  // ✅ For first send: default PENDING, for resend: default FAILED
  const [selectedStatuses, setSelectedStatuses] = useState<
    CampaignParticipantStatus[]
  >(
    isFirstSend
      ? [CampaignParticipantStatus.PENDING]
      : [CampaignParticipantStatus.FAILED],
  );

  const [sendMode, setSendMode] = useState<"NOW" | "SCHEDULED">("NOW");

  const toggleStatus = (status: CampaignParticipantStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleSubmit = () => {
    if (selectedStatuses.length === 0) {
      toast.error(t("Select at least one status"));
      return;
    }

    if (sendMode === "SCHEDULED" && (!scheduleDate || !scheduleTime)) {
      toast.error(t("Select date and time"));
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
          <DialogTitle>
            {isFirstSend ? "Send Campaign" : t("Resend Campaign")}
          </DialogTitle>
          <DialogDescription>
            {isFirstSend
              ? "Choose when to send to participants"
              : t("Choose when to send and which participants to resend to")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SEND MODE */}
          <div className="space-y-3">
            <Label className="font-semibold">{t("When to send")}</Label>
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
                  {t("Send Now")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="SCHEDULED"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm data-[state=on]:text-slate-900 dark:data-[state=on]:text-slate-50 text-slate-500 dark:text-slate-400 transition-all duration-200 border-0 h-auto"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {t("Schedule Later")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {sendMode === "SCHEDULED" && (
              <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
                {/* DATE PICKER */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                    >
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {scheduleDate
                          ? dayjs(scheduleDate).format("MMMM D, YYYY")
                          : t("Date")}
                      </span>
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        scheduleDate ? new Date(scheduleDate) : undefined
                      }
                      onSelect={(date) => {
                        if (!date) return;
                        setScheduleDate(date.toISOString().split("T")[0]);
                      }}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>

                {/* TIME PICKER */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border-0 p-0 h-auto bg-transparent shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STATUS SELECTION - Only for resends */}
          {!isFirstSend && (
            <div className="space-y-2">
              <Label className="font-semibold">{t("Participant Status")}</Label>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = selectedStatuses.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleStatus(opt.value)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer
              ${
                isSelected
                  ? "border-border bg-muted shadow-sm ring-1 ring-primary/40"
                  : "border-border bg-transparent opacity-50 hover:opacity-80"
              }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${opt.color.replace("text-", "bg-")}`}
                      />
                      <span className={opt.color}>{opt.labelKey}</span>
                    </button>
                  );
                })}
              </div>

              {selectedStatuses.length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  {t("Select at least one status")}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selectedStatuses.length === 0}
          >
            {isLoading
              ? t("Sending...")
              : isFirstSend
                ? "Send Campaign"
                : t("Resend Campaign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
