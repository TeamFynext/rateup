// Extracted verbatim from the `/dashboard/loyalty/settings/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { z } from "zod";

import { LoyaltyEventType, updateEventTrigger } from "@/backend/loyalty/eventTriggers.api";
import {
  useCreateEventTriggerMutation,
  useEventTriggers,
} from "@/backend/loyalty/eventTriggers.query";
import {
  useCreateLoyaltyProgramMutation,
  useDeleteLoyaltyProgramMutation,
  useLoyaltyProgram,
  useResetLoyaltyProgramPointsMutation,
  useUpdateLoyaltyProgramMutation,
} from "@/backend/loyalty/program.query";
import { automationKeys } from "@/backend/whatsapp/automation.keys";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { BasicSettings } from "@/components/loyalty/settings/BasicSettings.tsx";
import { BirthdayReminderSettings } from "@/components/loyalty/settings/BirthdayReminderSettings.tsx";
import { DEFAULT_JOIN_MESSAGE_TEXT } from "@/components/loyalty/settings/constants.ts";
import { DangerZone } from "@/components/loyalty/settings/DangerZone.tsx";
import { NotificationSettings } from "@/components/loyalty/settings/NotificationSettings.tsx";
import { PointsExpirationSettings } from "@/components/loyalty/settings/PointsExpirationSettings.tsx";
import { PointsExpirySettings } from "@/components/loyalty/settings/PointsExpirySettings.tsx";
import { PointsReminderSettings } from "@/components/loyalty/settings/PointsReminderSettings.tsx";
import { ReferralMessageSettings } from "@/components/loyalty/settings/ReferralMessageSettings.tsx";
import {
  BasicSettingsSchema,
  EventTriggersFormSchema,
  ExpirationSettingsSchema,
  NotificationsSettingsSchema,
} from "@/components/loyalty/settings/schemas.ts";
import { TierUpdateSettings } from "@/components/loyalty/settings/TierUpdateSettings.tsx";
import { TransactionNotifications } from "@/components/loyalty/settings/TransactionNotifications.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { docsPath } from "@/utils/constants.ts";
import { UserRole } from "@/utils/enums/index.ts";

export function LoyaltySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = useSearch({ strict: false });
  const activeTab = searchParams.tab ?? "general";
  const { user } = useUser();
  const isSuperAdmin = user?.role === UserRole.SUPADM;

  const { data: program, isLoading: isProgramLoading } = useLoyaltyProgram();
  const { data: eventTriggers } = useEventTriggers(program?.id || "");

  const updateProgramMutation = useUpdateLoyaltyProgramMutation(program?.id || "");
  const createProgramMutation = useCreateLoyaltyProgramMutation();
  const resetPointsMutation = useResetLoyaltyProgramPointsMutation();
  const deleteProgramMutation = useDeleteLoyaltyProgramMutation(() => {
    navigate({
      to: "/dashboard/loyalty/dashboard",
      replace: true,
    });
  });

  const createTriggerMutation = useCreateEventTriggerMutation();
  const confirm = useConfirm();

  // States for Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // States for modified buttons
  const [pointsReminderModified, setPointsReminderModified] = useState(false);
  const [tierUpgradedModified, setTierUpgradedModified] = useState(false);
  const [birthdayReminderModified, setBirthdayReminderModified] = useState(false);
  const [pointsIssuedModified, setPointsIssuedModified] = useState(false);
  const [pointsAdjustedModified, setPointsAdjustedModified] = useState(false);
  const [rewardIssuedModified, setRewardIssuedModified] = useState(false);
  const [rewardRedeemedModified, setRewardRedeemedModified] = useState(false);
  const [pointsExpiryAlertModified, setPointsExpiryAlertModified] = useState(false);
  const [pointsExpiredModified, setPointsExpiredModified] = useState(false);

  // Form
  const eventTriggersForm = useForm<z.infer<typeof EventTriggersFormSchema>>({
    resolver: zodResolver(EventTriggersFormSchema),
    defaultValues: {
      [LoyaltyEventType.POINTS_ISSUED]: {
        enabled: false,
        waTemplateId: undefined,
      },
      [LoyaltyEventType.POINTS_ADJUSTED]: {
        enabled: false,
        waTemplateId: undefined,
      },
      [LoyaltyEventType.REWARD_ISSUED]: {
        enabled: false,
        waTemplateId: undefined,
      },
      [LoyaltyEventType.REWARD_REDEEMED]: {
        enabled: false,
        waTemplateId: undefined,
      },
      [LoyaltyEventType.TIER_UPGRADED]: {
        enabled: false,
        waTemplateId: undefined,
      },
      [LoyaltyEventType.INACTIVITY_REMINDER]: {
        enabled: false,
        waTemplateId: undefined,
        triggerDays: "30",
      },
      [LoyaltyEventType.BIRTHDAY]: {
        enabled: false,
        waTemplateId: undefined,
        rewardId: undefined,
      },
      [LoyaltyEventType.POINTS_EXPIRY_ALERT]: {
        enabled: false,
        waTemplateId: undefined,
      },
      [LoyaltyEventType.POINTS_EXPIRED]: {
        enabled: false,
        waTemplateId: undefined,
      },
    },
  });

  // The trigger fields are addressed by a runtime `<eventType>.<field>` path,
  // which react-hook-form's per-path value type cannot express.
  const setEventTriggerField = eventTriggersForm.setValue as (path: string, value: unknown) => void;

  // Basic Settings Form
  const basicForm = useForm<z.infer<typeof BasicSettingsSchema>>({
    resolver: zodResolver(BasicSettingsSchema),
    defaultValues: {
      programName: "",
      pointsCurrency: "Points",
      moneyCurrency: "INR",
      defaultCountryCode: "IN",
      whatsappSettingsId: undefined,
      referralMessageTemplate: DEFAULT_JOIN_MESSAGE_TEXT,
    },
  });

  // Notifications Form
  const notificationsForm = useForm<z.infer<typeof NotificationsSettingsSchema>>({
    resolver: zodResolver(NotificationsSettingsSchema),
    defaultValues: {
      programActive: true,
      customerNotifications: true,
      autoApproveAdjustments: false,
      emailNotifications: true,
      whatsappNotifications: true,
      enableShopifyOrderPoints: false,
    },
  });

  // Expiration Form
  const expirationForm = useForm<z.infer<typeof ExpirationSettingsSchema>>({
    resolver: zodResolver(ExpirationSettingsSchema),
    defaultValues: {
      enabled: false,
      months: 12,
    },
  });

  // Store trigger IDs for updates
  const [triggerIds, setTriggerIds] = useState<{
    [key in LoyaltyEventType]?: string;
  }>({});

  // Sync state with data
  useEffect(() => {
    if (program) {
      if (!notificationsForm.formState.isDirty) {
        notificationsForm.reset({
          programActive: program.status === "active",
          customerNotifications: program.pointsActivityAlerts ?? true,
          autoApproveAdjustments: program.autoApproveAdjustments ?? false,
          emailNotifications: program.emailNotifications ?? true,
          whatsappNotifications: program.whatsappNotifications ?? true,
          enableShopifyOrderPoints: program.enableShopifyOrderPoints ?? false,
        });
      }

      if (!basicForm.formState.isDirty) {
        basicForm.reset({
          programName: program.name || "",
          pointsCurrency: program.currencyName || "Points",
          moneyCurrency: program.currencyCode || "INR",
          defaultCountryCode: program.defaultCountryCode || "IN",
          whatsappSettingsId: program.whatsappSettingsId,
          referralMessageTemplate: program.referralMessageTemplate || DEFAULT_JOIN_MESSAGE_TEXT,
        });
      }

      if (!expirationForm.formState.isDirty) {
        expirationForm.reset({
          enabled: program.enablePointsExpiration ?? false,
          months: program.pointsExpirationMonths || 12,
        });
      }
    }
  }, [program, basicForm, expirationForm, notificationsForm]);

  // Sync event triggers with UI state
  useEffect(() => {
    if (!eventTriggers || eventTriggers.length === 0) return;

    const triggerMap: { [key in LoyaltyEventType]?: string } = {};

    eventTriggers.forEach((trigger) => {
      triggerMap[trigger.eventType] = trigger.id;

      const eventType = trigger.eventType;
      switch (eventType) {
        case LoyaltyEventType.POINTS_ISSUED:
        case LoyaltyEventType.POINTS_ADJUSTED:
        case LoyaltyEventType.REWARD_ISSUED:
        case LoyaltyEventType.REWARD_REDEEMED:
        case LoyaltyEventType.TIER_UPGRADED:
          setEventTriggerField(`${eventType}.enabled`, trigger.enabled);
          if (trigger.waTemplateId) {
            setEventTriggerField(`${eventType}.waTemplateId`, trigger.waTemplateId);
          }
          break;
        case LoyaltyEventType.BIRTHDAY:
          setEventTriggerField(`${eventType}.enabled`, trigger.enabled);
          if (trigger.waTemplateId) {
            setEventTriggerField(`${eventType}.waTemplateId`, trigger.waTemplateId);
          }
          if (trigger.rewardId) {
            setEventTriggerField(`${eventType}.rewardId`, trigger.rewardId);
          }
          break;
        case LoyaltyEventType.INACTIVITY_REMINDER:
          setEventTriggerField(`${eventType}.enabled`, trigger.enabled);
          if (trigger.triggerDays) {
            setEventTriggerField(`${eventType}.triggerDays`, trigger.triggerDays.toString());
          }
          if (trigger.waTemplateId) {
            setEventTriggerField(`${eventType}.waTemplateId`, trigger.waTemplateId);
          }
          break;
        case LoyaltyEventType.POINTS_EXPIRY_ALERT:
        case LoyaltyEventType.POINTS_EXPIRED:
          setEventTriggerField(`${eventType}.enabled`, trigger.enabled);
          if (trigger.waTemplateId) {
            setEventTriggerField(`${eventType}.waTemplateId`, trigger.waTemplateId);
          }
          break;
      }
    });

    setTriggerIds(triggerMap);
  }, [eventTriggers, eventTriggersForm]);

  // Save Handlers
  const onSaveBasicSettings = async (data: z.infer<typeof BasicSettingsSchema>) => {
    const payload = {
      name: data.programName,
      currencyName: data.pointsCurrency,
      currencyCode: data.moneyCurrency,
      defaultCountryCode: data.defaultCountryCode,
      whatsappSettingsId: data.whatsappSettingsId,
      referralMessageTemplate: data.referralMessageTemplate,
    };
    if (program?.id) {
      updateProgramMutation.mutate(payload, { onSuccess: () => basicForm.reset(data) });
    } else {
      // Defaults are no longer seeded from here. The guided setup at
      // /dashboard/loyalty/onboarding writes tiers, rules and rewards server-side in one
      // transaction; the fire-and-forget Promise.all that used to live here was
      // non-atomic, swallowed every error, and wrote reward values the schema rejects.
      await createProgramMutation.mutateAsync(payload);
    }
  };

  const handleSaveEventTrigger = async (eventType: LoyaltyEventType) => {
    if (!program?.id) return;

    const values = eventTriggersForm.getValues(eventType);
    const triggerId = triggerIds[eventType];

    const triggerData = {
      programId: program.id,
      eventType,
      enabled: values.enabled,
      waTemplateId: values.waTemplateId,
      triggerDays: values.triggerDays ? Number.parseInt(values.triggerDays) : undefined,
      rewardId: values.rewardId,
    };

    try {
      if (triggerId) {
        // Update existing trigger
        await updateEventTrigger(triggerId, triggerData);
        // Invalidate queries to refetch
        queryClient.invalidateQueries({
          queryKey: automationKeys.eventTriggers(program.id),
        });
        toast.success(t("Settings saved"));
      } else {
        // Create new trigger
        const newTrigger = await createTriggerMutation.mutateAsync(triggerData);
        setTriggerIds((prev) => ({ ...prev, [eventType]: newTrigger.id }));
      }

      return true;
    } catch (error) {
      console.error("Error saving event trigger:", error);
      toast.error(t("Failed to save settings"));
      return false;
    }
  };

  const handleToggleEventTrigger = async (eventType: LoyaltyEventType, enabled: boolean) => {
    setEventTriggerField(`${eventType}.enabled`, enabled);
    const success = await handleSaveEventTrigger(eventType);
    if (success) {
      toast.success(enabled ? t("Notification enabled") : t("Notification disabled"));
    } else {
      // Revert if failed
      setEventTriggerField(`${eventType}.enabled`, !enabled);
    }
  };

  const handleSavePointsReminder = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.INACTIVITY_REMINDER);
    setPointsReminderModified(false);
  };

  const handleSaveTierUpgraded = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.TIER_UPGRADED);
    setTierUpgradedModified(false);
  };

  const handleSaveBirthdayReminder = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.BIRTHDAY);
    setBirthdayReminderModified(false);
  };

  const handleSavePointsIssued = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.POINTS_ISSUED);
    setPointsIssuedModified(false);
  };

  const handleSavePointsAdjusted = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.POINTS_ADJUSTED);
    setPointsAdjustedModified(false);
  };

  const handleSaveRewardIssued = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.REWARD_ISSUED);
    setRewardIssuedModified(false);
  };

  const handleSaveRewardRedeemed = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.REWARD_REDEEMED);
    setRewardRedeemedModified(false);
  };

  const handleSavePointsExpiryAlert = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.POINTS_EXPIRY_ALERT);
    setPointsExpiryAlertModified(false);
  };

  const handleSavePointsExpired = async () => {
    await handleSaveEventTrigger(LoyaltyEventType.POINTS_EXPIRED);
    setPointsExpiredModified(false);
  };

  const handleResetPoints = async () => {
    if (!program?.id) return;

    const shouldReset = await confirm({
      title: t("Reset Loyalty Points"),
      description: t(
        "Are you sure you want to reset all loyalty points? This action cannot be undone.",
      ),
      confirmText: t("Reset Points"),
    });

    if (!shouldReset) return;

    resetPointsMutation.mutate(program.id);
  };

  const handleDeleteProgram = () => {
    if (program?.id && deleteConfirmText === program.name) {
      deleteProgramMutation.mutate({ programId: program.id, force: true });
      setDeleteModalOpen(false);
      setDeleteConfirmText("");
    }
  };

  if (isProgramLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const noProgram = !program?.id;
  return (
    <div className="space-y-4 p-6 relative">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl mb-1">{t("Loyalty Program Settings")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Configure your loyalty program settings")}
          </p>
        </div>
        <InfoButton docUrl={`${docsPath}/loyality/settings`} />
      </div>
      {noProgram && (
        <Alert className="mb-4">
          <AlertTitle>{t("No loyalty program yet")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {t(
                "The guided setup builds your points, tiers, rewards and WhatsApp messages from a starting point you can edit — it's the quickest way in. You can still fill in the basics below by hand.",
              )}
            </span>
            <Button size="sm" render={<Link to="/dashboard/loyalty/onboarding" />}>
              {t("Run guided setup")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Tabs
        defaultValue={activeTab}
        className="w-full space-y-4"
        onValueChange={(value) => {
          navigate({
            to: `/dashboard/loyalty/settings?tab=${value}`,
          });
        }}
      >
        <TabsList>
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("Notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BasicSettings
                form={basicForm}
                onSave={onSaveBasicSettings}
                isPending={updateProgramMutation.isPending}
                programId={program?.id ?? null}
              />

              <NotificationSettings
                form={notificationsForm}
                programId={program?.id ?? null}
                disabled={noProgram}
              />

              <ReferralMessageSettings
                form={basicForm}
                onSave={onSaveBasicSettings}
                isPending={updateProgramMutation.isPending}
                disabled={noProgram}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PointsExpirationSettings
                form={expirationForm}
                programId={program?.id ?? null}
                disabled={noProgram}
              />

              <DangerZone
                onReset={handleResetPoints}
                onDelete={() => {
                  setDeleteConfirmText("");
                  setDeleteModalOpen(true);
                }}
                disabled={noProgram}
                showDelete={isSuperAdmin}
              />
            </div>
          </>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <>
            <div className="space-y-4">
              <TransactionNotifications
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSavePointsIssued={handleSavePointsIssued}
                onSavePointsAdjusted={handleSavePointsAdjusted}
                onSaveRewardIssued={handleSaveRewardIssued}
                onSaveRewardRedeemed={handleSaveRewardRedeemed}
                pointsIssuedModified={pointsIssuedModified}
                pointsAdjustedModified={pointsAdjustedModified}
                rewardIssuedModified={rewardIssuedModified}
                rewardRedeemedModified={rewardRedeemedModified}
                setPointsIssuedModified={setPointsIssuedModified}
                setPointsAdjustedModified={setPointsAdjustedModified}
                setRewardIssuedModified={setRewardIssuedModified}
                setRewardRedeemedModified={setRewardRedeemedModified}
                disabled={noProgram}
              />

              <TierUpdateSettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSave={handleSaveTierUpgraded}
                isModified={tierUpgradedModified}
                onModify={() => setTierUpgradedModified(true)}
                disabled={noProgram}
              />

              <PointsReminderSettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSave={handleSavePointsReminder}
                isModified={pointsReminderModified}
                onModify={() => setPointsReminderModified(true)}
                disabled={noProgram}
              />

              <BirthdayReminderSettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSave={handleSaveBirthdayReminder}
                isModified={birthdayReminderModified}
                onModify={() => setBirthdayReminderModified(true)}
                disabled={noProgram}
              />

              <PointsExpirySettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSaveAlert={handleSavePointsExpiryAlert}
                onSaveExpired={handleSavePointsExpired}
                isAlertModified={pointsExpiryAlertModified}
                isExpiredModified={pointsExpiredModified}
                onModifyAlert={() => setPointsExpiryAlertModified(true)}
                onModifyExpired={() => setPointsExpiredModified(true)}
                disabled={noProgram}
              />
            </div>
          </>
        </TabsContent>
      </Tabs>
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteModalOpen(false);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t("Delete Loyalty Program")}</DialogTitle>
            <DialogDescription>
              {t(
                "This action is permanent and cannot be undone. All program data will be removed.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t("Type")}{" "}
              <span className="font-semibold text-foreground">&quot;{program?.name}&quot;</span>{" "}
              {t("to confirm deletion")}
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteConfirmText === program?.name) {
                  handleDeleteProgram();
                }
              }}
              placeholder={program?.name ?? ""}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteConfirmText("");
              }}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== program?.name || deleteProgramMutation.isPending}
              onClick={handleDeleteProgram}
            >
              {deleteProgramMutation.isPending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("Delete Program")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
