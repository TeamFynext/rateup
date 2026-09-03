import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCalendar,
  IconChevronDown,
  IconClock,
  IconSend,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCampaignSendPreflight } from "@/backend/campaign/campaign.query.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
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
import { FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { CampaignParticipantStatus } from "@/types/enums.ts";

export interface ResendOptions {
  sendMode: "NOW" | "SCHEDULED";
  scheduleDate?: string;
  scheduleTime?: string;
  statuses: CampaignParticipantStatus[];
  /** Max messages dispatched per day. Undefined = send to everyone at once. */
  dailySendLimit?: number;
}

interface ResendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: ResendOptions) => void;
  isLoading?: boolean;
  stats?: Record<string, number | undefined>;
  isFirstSend?: boolean;
  /** The campaign's saved cap. The modal opens showing this rather than resetting. */
  campaignDailySendLimit?: number | null;
  /** Enables the conversation-allowance check. Omitted, the modal simply does not warn. */
  campaignId?: string;
}

// Keys of the `stats` prop, which counts participants per status.
const STATUS_STAT_KEY: Record<CampaignParticipantStatus, string> = {
  [CampaignParticipantStatus.FAILED]: "failed",
  [CampaignParticipantStatus.PENDING]: "pending",
  [CampaignParticipantStatus.SENT]: "sent",
  [CampaignParticipantStatus.DELIVERED]: "delivered",
  [CampaignParticipantStatus.READ]: "read",
  [CampaignParticipantStatus.COMPLETED]: "completed",
};

const DEFAULT_DAILY_SEND_LIMIT = "250";

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
  stats,
  isFirstSend = false,
  campaignDailySendLimit = null,
  campaignId,
}: ResendCampaignModalProps) => {
  const { t } = useTranslation("campaign.resend");
  const getToday = () => new Date().toISOString().split("T")[0];
  const [scheduleDate, setScheduleDate] = useState(getToday());
  const [scheduleTime, setScheduleTime] = useState("09:00");

  // ✅ For first send: default PENDING, for resend: default FAILED
  const [selectedStatuses, setSelectedStatuses] = useState<CampaignParticipantStatus[]>(
    isFirstSend ? [CampaignParticipantStatus.PENDING] : [CampaignParticipantStatus.FAILED],
  );

  const [sendMode, setSendMode] = useState<"NOW" | "SCHEDULED">("NOW");
  const [isDailyLimitEnabled, setIsDailyLimitEnabled] = useState(!!campaignDailySendLimit);
  const [dailySendLimit, setDailySendLimit] = useState(
    campaignDailySendLimit ? String(campaignDailySendLimit) : DEFAULT_DAILY_SEND_LIMIT,
  );

  // The modal stays mounted between opens, so the initial state above is stale
  // once the campaign query resolves. Re-seed from the saved cap on each open.
  useEffect(() => {
    if (!isOpen) return;
    setIsDailyLimitEnabled(!!campaignDailySendLimit);
    setDailySendLimit(
      campaignDailySendLimit ? String(campaignDailySendLimit) : DEFAULT_DAILY_SEND_LIMIT,
    );
  }, [isOpen, campaignDailySendLimit]);

  const toggleStatus = (status: CampaignParticipantStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const parsedDailyLimit = Number(dailySendLimit);
  const isDailyLimitValid =
    Number.isInteger(parsedDailyLimit) && parsedDailyLimit > 0 && dailySendLimit.trim() !== "";

  // How many participants this send will actually target, so the user can see
  // how many days the cap stretches the campaign over.
  const recipientCount = selectedStatuses.reduce(
    (total, status) => total + (stats?.[STATUS_STAT_KEY[status]] ?? 0),
    0,
  );
  const estimatedDays =
    isDailyLimitEnabled && isDailyLimitValid && recipientCount > 0
      ? Math.ceil(recipientCount / parsedDailyLimit)
      : 0;

  // What this send would cost against the org's conversation allowance. Asked of the
  // server rather than derived from `recipientCount`, because the allowance itself lives
  // there: packs bought, an annual pool, a contracted Enterprise ceiling, and the metered
  // windows already spent this period.
  const { data: preflight } = useCampaignSendPreflight(
    campaignId ?? "",
    selectedStatuses,
    isOpen && !!campaignId,
  );
  const period = preflight?.isAnnual ? t("this year") : t("this month");

  const handleSubmit = () => {
    if (selectedStatuses.length === 0) {
      toast.error(t("Select at least one status"));
      return;
    }

    if (sendMode === "SCHEDULED" && (!scheduleDate || !scheduleTime)) {
      toast.error(t("Select date and time"));
      return;
    }

    if (isDailyLimitEnabled && !isDailyLimitValid) {
      toast.error(t("Enter a daily send limit of at least 1"));
      return;
    }

    onSubmit({
      sendMode,
      scheduleDate: sendMode === "SCHEDULED" ? scheduleDate : undefined,
      scheduleTime: sendMode === "SCHEDULED" ? scheduleTime : undefined,
      statuses: selectedStatuses,
      dailySendLimit: isDailyLimitEnabled ? parsedDailyLimit : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isFirstSend ? "Send Campaign" : t("Resend Campaign")}</DialogTitle>
          <DialogDescription>
            {isFirstSend
              ? "Choose when to send to participants"
              : t("Choose when to send and which participants to resend to")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CONVERSATION ALLOWANCE — only ever shown when there is something to act on.
              A campaign that fits says nothing: a banner on every send would be noise, and
              the number is already on the billing page. */}
          {preflight?.metered && preflight.exhausted && (
            <Alert variant="destructive">
              <IconAlertTriangle />
              <AlertTitle>{t("No conversations left")}</AlertTitle>
              <AlertDescription>
                {t(
                  "You have used all {max} conversations on your plan {period}, so this campaign cannot be sent yet. Buy a conversation pack or wait for your allowance to reset.",
                  { max: preflight.max?.toLocaleString(), period },
                )}
              </AlertDescription>
            </Alert>
          )}
          {preflight?.metered && !preflight.exhausted && preflight.shortfall > 0 && (
            <Alert>
              <IconAlertTriangle className="text-amber-700 dark:text-amber-500" />
              <AlertTitle>{t("This campaign may not reach everyone")}</AlertTitle>
              <AlertDescription>
                {t(
                  "It goes to {recipients} people and you have {remaining} conversations left {period}, so up to {shortfall} may not be delivered. A contact you are already in an open conversation with costs nothing extra, so the real number may be lower.",
                  {
                    recipients: preflight.recipients.toLocaleString(),
                    remaining: preflight.remaining?.toLocaleString(),
                    period,
                    shortfall: preflight.shortfall.toLocaleString(),
                  },
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* SEND MODE */}
          <div className="space-y-3">
            <FieldTitle className="font-semibold">{t("When to send")}</FieldTitle>
            <Tabs
              value={sendMode}
              onValueChange={(value) => setSendMode(value as "NOW" | "SCHEDULED")}
            >
              <TabsList>
                <TabsTrigger value="NOW">
                  <IconSend />
                  {t("Send Now")}
                </TabsTrigger>
                <TabsTrigger value="SCHEDULED">
                  <IconCalendar />
                  {t("Schedule Later")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="SCHEDULED">
                <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
                  {/* DATE PICKER */}
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                        />
                      }
                    >
                      <IconCalendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {scheduleDate ? dayjs(scheduleDate).format("MMMM D, YYYY") : t("Date")}
                      </span>
                      <IconChevronDown className="w-4 h-4" />
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate ? new Date(scheduleDate) : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          setScheduleDate(date.toISOString().split("T")[0]);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>

                  {/* TIME PICKER */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background">
                    <FieldLabel htmlFor="resend-schedule-time" className="sr-only">
                      {t("Send time")}
                    </FieldLabel>
                    <IconClock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="resend-schedule-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="border-0 p-0 h-auto bg-transparent shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* DAILY SEND LIMIT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <FieldLabel htmlFor="dailySendLimit" className="font-semibold">
                  {t("Limit messages per day")}
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Spread this campaign across consecutive days instead of sending at once. Saved to the campaign.",
                  )}
                </p>
              </div>
              <Switch
                id="dailySendLimit"
                checked={isDailyLimitEnabled}
                onCheckedChange={setIsDailyLimitEnabled}
              />
            </div>

            {isDailyLimitEnabled && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="dailySendLimitValue" className="sr-only">
                    {t("Messages per day")}
                  </FieldLabel>
                  <Input
                    id="dailySendLimitValue"
                    type="number"
                    min={1}
                    step={1}
                    value={dailySendLimit}
                    onChange={(e) => setDailySendLimit(e.target.value)}
                    aria-invalid={!isDailyLimitValid}
                    aria-describedby={!isDailyLimitValid ? "dailySendLimitValue-error" : undefined}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">{t("messages per day")}</span>
                </div>

                {!isDailyLimitValid ? (
                  <p
                    id="dailySendLimitValue-error"
                    role="alert"
                    className="text-xs text-destructive flex items-center gap-1.5"
                  >
                    <IconAlertCircle className="w-3 h-3" />
                    {t("Enter a daily send limit of at least 1")}
                  </p>
                ) : (
                  estimatedDays > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("{total} recipients will be sent over {days} day(s)", {
                        total: recipientCount,
                        days: estimatedDays,
                      })}
                    </p>
                  )
                )}
              </div>
            )}
          </div>

          {/* STATUS SELECTION - Only for resends */}
          {!isFirstSend && (
            <div className="space-y-2">
              <FieldTitle className="font-semibold">{t("Participant Status")}</FieldTitle>

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
                  <IconAlertCircle className="w-3 h-3" />
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
            disabled={
              isLoading ||
              selectedStatuses.length === 0 ||
              (isDailyLimitEnabled && !isDailyLimitValid)
            }
          >
            {isLoading ? t("Sending...") : isFirstSend ? "Send Campaign" : t("Resend Campaign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
