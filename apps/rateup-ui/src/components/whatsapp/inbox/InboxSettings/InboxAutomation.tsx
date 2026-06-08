import React, { useEffect, useState } from "react";

import {
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Clock,
  GitPullRequest,
  ListFilter,
  Loader2,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Timer,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDisableInboxAutomationMutation,
  useEnableInboxAutomationMutation,
  useInboxAutomation,
  useUpdateInboxAutomationMutation,
} from "@/backend/whatsapp/inbox/inboxAutomation/inboxautomation.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

export default function InboxAutomation() {
  const { t } = useTranslation();
  const { data: serverData, isLoading: isQueryLoading } = useInboxAutomation();
  const enableMutation = useEnableInboxAutomationMutation();
  const disableMutation = useDisableInboxAutomationMutation();
  const updateMutation = useUpdateInboxAutomationMutation();

  // State for Unassigned chats automation
  const [unassignedActive, setUnassignedActive] = useState(false);
  const [unassignedDelayHours, setUnassignedDelayHours] =
    useState<string>("24");

  // State for Assigned chats automation
  const [assignedActive, setAssignedActive] = useState(false);
  const [assignedDelayHours, setAssignedDelayHours] = useState<string>("24");

  const [isPending, setIsPending] = useState(false);

  // Sync state with server data
  useEffect(() => {
    if (serverData) {
      const unassignedAuto = serverData.find(
        (a) => a.condition === "UNASSIGNED",
      );
      const assignedAuto = serverData.find((a) => a.condition === "ASSIGNED");

      setUnassignedActive(!!unassignedAuto);
      if (unassignedAuto && unassignedAuto.closeAfterHours !== null) {
        setUnassignedDelayHours(String(unassignedAuto.closeAfterHours));
      } else {
        setUnassignedDelayHours("24");
      }

      setAssignedActive(!!assignedAuto);
      if (assignedAuto && assignedAuto.closeAfterHours !== null) {
        setAssignedDelayHours(String(assignedAuto.closeAfterHours));
      } else {
        setAssignedDelayHours("24");
      }
    }
  }, [serverData]);

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
    } catch (err) {
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
    } catch (err) {
      toast.error(t("Failed to update assigned automation state"));
    } finally {
      setIsPending(false);
    }
  };

  // Save Unassigned configuration individually
  const handleSaveUnassigned = async () => {
    setIsPending(true);
    const toastId = toast.loading(t("Saving unassigned settings") + "...");
    try {
      await updateMutation.mutateAsync({
        condition: "UNASSIGNED",
        data: { closeAfterHours: Number(unassignedDelayHours) },
      });
      toast.success(
        t("Unassigned chat auto-close delay updated successfully"),
        { id: toastId },
      );
    } catch (err) {
      toast.error(t("Failed to save unassigned settings"), { id: toastId });
    } finally {
      setIsPending(false);
    }
  };

  // Save Assigned configuration individually
  const handleSaveAssigned = async () => {
    setIsPending(true);
    const toastId = toast.loading(t("Saving assigned settings") + "...");
    try {
      await updateMutation.mutateAsync({
        condition: "ASSIGNED",
        data: { closeAfterHours: Number(assignedDelayHours) },
      });
      toast.success(t("Assigned chat auto-close delay updated successfully"), {
        id: toastId,
      });
    } catch (err) {
      toast.error(t("Failed to save assigned settings"), { id: toastId });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Info Banner */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-6 shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="h-24 w-24 text-violet-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-violet-500" />
            {t("Inbox Auto-Close Automations")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              "Automatically close conversation threads after a defined period of inactivity",
            )}
            .
          </p>
        </div>
      </div>

      {/* Grid containing both automation configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Unassigned Chats */}
        <Card className="border-2 border-violet-100 dark:border-violet-950/60 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header / Active status toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-violet-100 dark:border-violet-900/30">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      {t("New/Unassigned Chats")}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t("Auto-close idle new/unassigned conversations")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {unassignedActive ? t("Active") : t("Inactive")}
                  </span>
                  <Switch
                    checked={unassignedActive}
                    onCheckedChange={handleToggleUnassigned}
                    disabled={isPending || isQueryLoading}
                  />
                </div>
              </div>

              {/* Condition (If) block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                    {t("If")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("Trigger criteria")}
                  </span>
                </div>

                <div className="border border-violet-200/60 dark:border-violet-900/50 rounded-xl p-4 bg-violet-50/10 dark:bg-violet-950/5 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-background border border-violet-100 dark:border-violet-900 rounded font-medium text-muted-foreground">
                      {t("Status")}
                    </div>
                    <div className="p-2 bg-background border border-violet-100 dark:border-violet-900 rounded font-medium text-muted-foreground">
                      {t("Is")}
                    </div>
                    <div className="p-2 bg-violet-100/30 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded font-bold">
                      {t("New/Unassigned")}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-violet-100 dark:border-violet-900/30 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-violet-500" />{" "}
                      {t("Inactive for:")}
                    </span>
                    <Select
                      value={unassignedDelayHours}
                      onValueChange={(val) => setUnassignedDelayHours(val)}
                      disabled={isPending || !unassignedActive}
                    >
                      <SelectTrigger className="w-32 bg-background border-violet-300 dark:border-violet-850 focus:ring-violet-500 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">{t("24 Hours")}</SelectItem>
                        <SelectItem value="48">{t("48 Hours")}</SelectItem>
                        <SelectItem value="72">{t("72 Hours")}</SelectItem>
                        <SelectItem value="168">{t("1 Week")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action (Then) block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    {t("Then")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("Execution action")}
                  </span>
                </div>
                <div className="border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-4 bg-emerald-50/10 dark:bg-emerald-950/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      {t("Action Type")}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 gap-1 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />{" "}
                      {t("Close Conversation")}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Save Button */}
            <div className="pt-4 mt-6 border-t border-violet-100 dark:border-violet-900/30 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveUnassigned}
                disabled={isPending || !unassignedActive}
                className="px-4 py-1.5 text-xs h-8"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {t("Save New/Unassigned Settings")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Assigned Chats */}
        <Card className="border-2 border-violet-100 dark:border-violet-950/60 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header / Active status toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-violet-100 dark:border-violet-900/30">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">
                      {t("Assigned Chats")}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t("Auto-close idle assigned conversations")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {assignedActive ? t("Active") : t("Inactive")}
                  </span>
                  <Switch
                    checked={assignedActive}
                    onCheckedChange={handleToggleAssigned}
                    disabled={isPending || isQueryLoading}
                  />
                </div>
              </div>

              {/* Condition (If) block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                    {t("If")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("Trigger criteria")}
                  </span>
                </div>

                <div className="border border-violet-200/60 dark:border-violet-900/50 rounded-xl p-4 bg-violet-50/10 dark:bg-violet-950/5 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-background border border-violet-100 dark:border-violet-900 rounded font-medium text-muted-foreground">
                      {t("Status")}
                    </div>
                    <div className="p-2 bg-background border border-violet-100 dark:border-violet-900 rounded font-medium text-muted-foreground">
                      {t("Is")}
                    </div>
                    <div className="p-2 bg-violet-100/30 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded font-bold">
                      {t("Assigned")}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-violet-100 dark:border-violet-900/30 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-violet-500" />{" "}
                      {t("Inactive for:")}
                    </span>
                    <Select
                      value={assignedDelayHours}
                      onValueChange={(val) => setAssignedDelayHours(val)}
                      disabled={isPending || !assignedActive}
                    >
                      <SelectTrigger className="w-32 bg-background border-violet-300 dark:border-violet-850 focus:ring-violet-500 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">{t("24 Hours")}</SelectItem>
                        <SelectItem value="48">{t("48 Hours")}</SelectItem>
                        <SelectItem value="72">{t("72 Hours")}</SelectItem>
                        <SelectItem value="168">{t("1 Week")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action (Then) block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    {t("Then")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("Execution action")}
                  </span>
                </div>
                <div className="border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-4 bg-emerald-50/10 dark:bg-emerald-950/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      {t("Action Type")}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 gap-1 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />{" "}
                      {t("Close Conversation")}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Save Button */}
            <div className="pt-4 mt-6 border-t border-violet-100 dark:border-violet-900/30 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveAssigned}
                disabled={isPending || !assignedActive}
                className="px-4 py-1.5 text-xs h-8"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {t("Save Assigned Settings")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
