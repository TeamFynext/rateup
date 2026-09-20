import { IconArrowRight, IconBolt, IconClock, IconPencil } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDisableInboxAutomationMutation,
  useEnableInboxAutomationMutation,
  useInboxAutomation,
  useUpdateInboxAutomationMutation,
} from "@/backend/whatsapp/inbox/inboxAutomation/inboxautomation.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Switch } from "@/components/ui/switch.tsx";

export default function InboxAutomation() {
  const { t } = useTranslation();
  const { data: serverData, isLoading: isQueryLoading } = useInboxAutomation();
  const enableMutation = useEnableInboxAutomationMutation();
  const disableMutation = useDisableInboxAutomationMutation();
  const updateMutation = useUpdateInboxAutomationMutation();

  // State for Unassigned chats automation
  const [unassignedActive, setUnassignedActive] = useState(false);
  const [unassignedDelayHours, setUnassignedDelayHours] = useState<number>(24);

  // State for Assigned chats automation
  const [assignedActive, setAssignedActive] = useState(false);
  const [assignedDelayHours, setAssignedDelayHours] = useState<number>(24);

  const [isPending, setIsPending] = useState(false);

  // Edit dialog state
  const [editingRule, setEditingRule] = useState<"UNASSIGNED" | "ASSIGNED" | null>(null);
  const [tempHours, setTempHours] = useState<number>(24);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customVal, setCustomVal] = useState<string>("");

  const STD_HOURS = [1, 2, 4, 6, 8, 12, 24, 48, 72, 168];

  // Sync state with server data
  useEffect(() => {
    if (serverData) {
      const unassignedAuto = serverData.find((a) => a.condition === "UNASSIGNED");
      const assignedAuto = serverData.find((a) => a.condition === "ASSIGNED");

      setUnassignedActive(!!unassignedAuto);
      if (unassignedAuto && unassignedAuto.closeAfterHours !== null) {
        setUnassignedDelayHours(unassignedAuto.closeAfterHours);
      } else {
        setUnassignedDelayHours(24);
      }

      setAssignedActive(!!assignedAuto);
      if (assignedAuto && assignedAuto.closeAfterHours !== null) {
        setAssignedDelayHours(assignedAuto.closeAfterHours);
      } else {
        setAssignedDelayHours(24);
      }
    }
  }, [serverData]);

  // Sync edit dialog state when editingRule changes
  useEffect(() => {
    if (editingRule) {
      const currentHours = editingRule === "UNASSIGNED" ? unassignedDelayHours : assignedDelayHours;
      setTempHours(currentHours);
      const isStd = STD_HOURS.includes(currentHours);
      setCustomMode(!isStd);
      setCustomVal(!isStd ? String(currentHours) : "");
    }
  }, [editingRule, unassignedDelayHours, assignedDelayHours]);

  // Handle toggle for unassigned (Enable = Create, Disable = Delete)
  const handleToggleUnassigned = async (checked: boolean) => {
    setIsPending(true);
    try {
      if (checked) {
        await enableMutation.mutateAsync("UNASSIGNED");
        setUnassignedActive(true);
        toast.success(t("Unassigned automation enabled successfully"));
      } else {
        await disableMutation.mutateAsync("UNASSIGNED");
        setUnassignedActive(false);
        toast.success(t("Unassigned automation disabled successfully"));
      }
    } catch {
      toast.error(t("Failed to update unassigned automation state"));
    } finally {
      setIsPending(false);
    }
  };

  // Handle toggle for assigned (Enable = Create, Disable = Delete)
  const handleToggleAssigned = async (checked: boolean) => {
    setIsPending(true);
    try {
      if (checked) {
        await enableMutation.mutateAsync("ASSIGNED");
        setAssignedActive(true);
        toast.success(t("Assigned automation enabled successfully"));
      } else {
        await disableMutation.mutateAsync("ASSIGNED");
        setAssignedActive(false);
        toast.success(t("Assigned automation disabled successfully"));
      }
    } catch {
      toast.error(t("Failed to update assigned automation state"));
    } finally {
      setIsPending(false);
    }
  };

  // Save changes inside dialog
  const handleSaveChanges = async () => {
    if (!editingRule) return;
    setIsPending(true);
    const toastId = toast.loading(t("Saving settings..."));
    try {
      await updateMutation.mutateAsync({
        condition: editingRule,
        data: { closeAfterHours: tempHours },
      });
      toast.success(t("Auto-close delay updated successfully"), {
        id: toastId,
      });
      setEditingRule(null);
    } catch {
      toast.error(t("Failed to save settings"), { id: toastId });
    } finally {
      setIsPending(false);
    }
  };

  const getHourLabel = (h: number) => {
    if (h < 24) return `${h}h`;
    if (h === 24) return `24h`;
    if (h === 48) return `2 days`;
    if (h === 72) return `3 days`;
    if (h === 168) return `1 week`;
    return `${h}h`;
  };

  const previewHoursText = customMode && customVal ? `${customVal}h` : getHourLabel(tempHours);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info Block */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{t("Auto-Close Rules")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {t("Automatically close conversations that have been idle for a set period")}
          </p>
        </div>
      </div>
      {/* Rules list container */}
      <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-sm divide-y divide-border overflow-hidden">
        {/* Row 1: New / Unassigned Chats */}
        <div className="group flex items-center gap-4 py-4 px-6 bg-white dark:bg-card hover:bg-muted/50 /10 transition-colors w-full">
          {/* Icon Badge */}
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconBolt className="w-4 h-4 fill-primary/10" />
          </div>

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {t("New / Unassigned Chats")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("Inactive for {time} → Close Conversation", {
                time: getHourLabel(unassignedDelayHours),
              })}
            </div>
          </div>

          {/* Condition badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 rounded-full select-none">
              {t("New / Unassigned")}
            </span>
            <IconArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="bg-muted text-muted-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 select-none">
              <IconClock className="w-3.5 h-3.5" />
              {getHourLabel(unassignedDelayHours)}
            </span>
            <IconArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-full select-none">
              {t("Close")}
            </span>
          </div>

          {/* Toggle Switch */}
          <Switch
            checked={unassignedActive}
            onCheckedChange={handleToggleUnassigned}
            disabled={isPending || isQueryLoading}
            className="shrink-0"
          />

          {/* Edit Button (reveals on hover) */}
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <Button
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hover:bg-muted text-muted-foreground hover:text-foreground h-8 w-8 p-0"
              onClick={() => setEditingRule("UNASSIGNED")}
              disabled={isPending || !unassignedActive}
            >
              <IconPencil className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Assigned Chats */}
        <div className="group flex items-center gap-4 py-4 px-6 bg-white dark:bg-card hover:bg-muted/50 /10 transition-colors w-full">
          {/* Icon Badge */}
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <IconBolt className="w-4 h-4 fill-emerald-50/20" />
          </div>

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{t("Assigned Chats")}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("Inactive for {time} → Close Conversation", {
                time: getHourLabel(assignedDelayHours),
              })}
            </div>
          </div>

          {/* Condition badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-full select-none">
              {t("Assigned")}
            </span>
            <IconArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="bg-muted text-muted-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 select-none">
              <IconClock className="w-3.5 h-3.5" />
              {getHourLabel(assignedDelayHours)}
            </span>
            <IconArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-full select-none">
              {t("Close")}
            </span>
          </div>

          {/* Toggle Switch */}
          <Switch
            checked={assignedActive}
            onCheckedChange={handleToggleAssigned}
            disabled={isPending || isQueryLoading}
            className="shrink-0"
          />

          {/* Edit Button (reveals on hover) */}
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <Button
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hover:bg-muted text-muted-foreground hover:text-foreground h-8 w-8 p-0"
              onClick={() => setEditingRule("ASSIGNED")}
              disabled={isPending || !assignedActive}
            >
              <IconPencil className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      {/* Edit Dialog */}
      <Dialog
        open={editingRule !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit Auto-Close Rule")}</DialogTitle>
            <DialogDescription>
              {t("Automatically close conversations that have been idle for a set period.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Field: Chat Type */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t("Chat Type")}
              </span>
              {editingRule === "UNASSIGNED" ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {t("New / Unassigned")}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {t("Assigned Chats")}
                  </span>
                </div>
              )}
            </div>

            {/* Field: Close After Inactivity */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t("Close After Inactivity")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STD_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setTempHours(h);
                      setCustomMode(false);
                    }}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                      tempHours === h && !customMode
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {getHourLabel(h)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCustomMode(true);
                    const isStd = STD_HOURS.includes(tempHours);
                    setCustomVal(!isStd ? String(tempHours) : "");
                  }}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                    customMode
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("Custom")}
                </button>
              </div>

              {customMode && (
                <div className="flex items-center gap-2 mt-2.5 animate-fadeIn">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={customVal}
                    onChange={(e) => {
                      setCustomVal(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n > 0) {
                        setTempHours(n);
                      }
                    }}
                    placeholder={t("e.g. 36")}
                    className="w-28 px-3 py-1.5 border border-border rounded-lg bg-muted text-xs outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs font-medium text-muted-foreground">{t("hours")}</span>
                </div>
              )}
            </div>

            {/* Field: Action */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t("Action")}
              </span>
              <div className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                    {t("Close Conversation")}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                    {t("Thread is marked closed. Agents can reopen at any time.")}
                  </div>
                </div>
              </div>
            </div>

            {/* Rule Preview */}
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{t("Preview:")} </span>
              {t("If a")}
              {""}
              <strong className="text-primary">
                {editingRule === "UNASSIGNED" ? t("New/Unassigned") : t("Assigned")}
              </strong>
              {""}
              {t("chat is inactive for")}
              {""}
              <strong className="text-primary">{previewHoursText}</strong>, {t("automatically")}
              {""}
              <strong className="text-emerald-600 dark:text-emerald-400">{t("close")}</strong>
              {""}
              {t("it.")}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <DialogClose
              render={
                <Button variant="secondary" size="sm" className="text-xs font-semibold px-4" />
              }
            >
              {t("Cancel")}
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              onClick={handleSaveChanges}
              loading={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold px-4 flex items-center gap-1.5"
            >
              {t("Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
