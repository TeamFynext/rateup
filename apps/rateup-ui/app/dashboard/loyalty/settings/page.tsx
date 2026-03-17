"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  LoyaltyEventType,
  updateEventTrigger,
} from "@/backend/loyalty/eventTriggers.api";
import {
  useCreateEventTriggerMutation,
  useEventTriggers,
} from "@/backend/loyalty/eventTriggers.query";
import {
  useDeleteLoyaltyProgramMutation,
  useLoyaltyProgram,
  useResetLoyaltyProgramPointsMutation,
  useUpdateLoyaltyProgramMutation,
} from "@/backend/loyalty/program.query";
import InfoButton from "@/components/Button/InfoButton";
import { BasicSettings } from "@/components/loyalty/settings/BasicSettings";
import { BirthdayReminderSettings } from "@/components/loyalty/settings/BirthdayReminderSettings";
import { DEFAULT_JOIN_MESSAGE_TEMPLATE } from "@/components/loyalty/settings/constants";
import { DangerZone } from "@/components/loyalty/settings/DangerZone";
import { NotificationSettings } from "@/components/loyalty/settings/NotificationSettings";
import { PointsExpirationSettings } from "@/components/loyalty/settings/PointsExpirationSettings";
import { PointsReminderSettings } from "@/components/loyalty/settings/PointsReminderSettings";
import { ReferralMessageSettings } from "@/components/loyalty/settings/ReferralMessageSettings";
import {
  BasicSettingsSchema,
  EventTriggersFormSchema,
  ExpirationSettingsSchema,
  NotificationsSettingsSchema,
} from "@/components/loyalty/settings/schemas";
import { TierUpdateSettings } from "@/components/loyalty/settings/TierUpdateSettings";
import { TransactionNotifications } from "@/components/loyalty/settings/TransactionNotifications";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { docsPath } from "@/utils/constants";

export default function LoyaltySettingsPage() {
  const t = useExtracted();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "general";

  const { data: program, isLoading: isProgramLoading } = useLoyaltyProgram();
  const { data: eventTriggers } = useEventTriggers(program?.id || "");

  const updateProgramMutation = useUpdateLoyaltyProgramMutation(
    program?.id || "",
  );
  const resetPointsMutation = useResetLoyaltyProgramPointsMutation();
  const deleteProgramMutation = useDeleteLoyaltyProgramMutation(() => {
    router.replace("/dashboard/loyalty/dashboard");
  });

  const createTriggerMutation = useCreateEventTriggerMutation();

  // States for Modals
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // States for modified buttons
  const [pointsReminderModified, setPointsReminderModified] = useState(false);
  const [tierUpgradedModified, setTierUpgradedModified] = useState(false);
  const [birthdayReminderModified, setBirthdayReminderModified] =
    useState(false);
  const [pointsIssuedModified, setPointsIssuedModified] = useState(false);
  const [pointsAdjustedModified, setPointsAdjustedModified] = useState(false);
  const [rewardIssuedModified, setRewardIssuedModified] = useState(false);
  const [rewardRedeemedModified, setRewardRedeemedModified] = useState(false);

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
    },
  });

  // Basic Settings Form
  const basicForm = useForm<z.infer<typeof BasicSettingsSchema>>({
    resolver: zodResolver(BasicSettingsSchema),
    defaultValues: {
      programName: "",
      pointsCurrency: "Points",
      moneyCurrency: "AED",
      defaultCountryCode: "AE",
      whatsappSettingsId: undefined,
      referralMessageTemplate: DEFAULT_JOIN_MESSAGE_TEMPLATE,
    },
  });

  // Notifications Form
  const notificationsForm = useForm<
    z.infer<typeof NotificationsSettingsSchema>
  >({
    resolver: zodResolver(NotificationsSettingsSchema),
    defaultValues: {
      programActive: true,
      customerNotifications: true,
      autoApproveAdjustments: false,
      emailNotifications: true,
      whatsappNotifications: true,
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
      basicForm.reset({
        programName: program.name || "RateUp Rewards",
        pointsCurrency: program.currencyName || "Points",
        moneyCurrency: program.currencyCode || "AED",
        defaultCountryCode: program.defaultCountryCode || "AE",
        whatsappSettingsId: program.whatsappSettingsId,
        referralMessageTemplate:
          program.referralMessageTemplate || DEFAULT_JOIN_MESSAGE_TEMPLATE,
      });

      notificationsForm.reset({
        programActive: program.status === "active",
        customerNotifications: program.customerNotifications ?? true,
        autoApproveAdjustments: program.autoApproveAdjustments ?? false,
        emailNotifications: program.emailNotifications ?? true,
        whatsappNotifications: program.whatsappNotifications ?? true,
      });

      expirationForm.reset({
        enabled: program.enablePointsExpiration ?? false,
        months: program.pointsExpirationMonths || 12,
      });
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
          eventTriggersForm.setValue(
            `${eventType}.enabled` as any,
            trigger.enabled,
          );
          if (trigger.waTemplateId) {
            eventTriggersForm.setValue(
              `${eventType}.waTemplateId` as any,
              trigger.waTemplateId,
            );
          }
          break;
        case LoyaltyEventType.BIRTHDAY:
          eventTriggersForm.setValue(
            `${eventType}.enabled` as any,
            trigger.enabled,
          );
          if (trigger.waTemplateId) {
            eventTriggersForm.setValue(
              `${eventType}.waTemplateId` as any,
              trigger.waTemplateId,
            );
          }
          if (trigger.rewardId) {
            eventTriggersForm.setValue(
              `${eventType}.rewardId` as any,
              trigger.rewardId,
            );
          }
          break;
        case LoyaltyEventType.INACTIVITY_REMINDER:
          eventTriggersForm.setValue(
            `${eventType}.enabled` as any,
            trigger.enabled,
          );
          if (trigger.triggerDays) {
            eventTriggersForm.setValue(
              `${eventType}.triggerDays` as any,
              trigger.triggerDays.toString(),
            );
          }
          if (trigger.waTemplateId) {
            eventTriggersForm.setValue(
              `${eventType}.waTemplateId` as any,
              trigger.waTemplateId,
            );
          }
          break;
      }
    });

    setTriggerIds(triggerMap);
  }, [eventTriggers, eventTriggersForm]);

  // Save Handlers
  const onSaveBasicSettings = (data: z.infer<typeof BasicSettingsSchema>) => {
    if (program?.id) {
      updateProgramMutation.mutate({
        name: data.programName,
        currencyName: data.pointsCurrency,
        currencyCode: data.moneyCurrency,
        defaultCountryCode: data.defaultCountryCode,
        whatsappSettingsId: data.whatsappSettingsId,
        referralMessageTemplate: data.referralMessageTemplate,
      });
    }
  };

  const handleSaveNotifications = (updates: any) => {
    if (program?.id) {
      updateProgramMutation.mutate(updates);
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
      triggerDays: values.triggerDays
        ? Number.parseInt(values.triggerDays)
        : undefined,
      rewardId: values.rewardId,
    };

    try {
      if (triggerId) {
        // Update existing trigger
        await updateEventTrigger(triggerId, triggerData);
        // Invalidate queries to refetch
        queryClient.invalidateQueries({
          queryKey: ["event-triggers", program.id],
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

  const handleToggleEventTrigger = async (
    eventType: LoyaltyEventType,
    enabled: boolean,
  ) => {
    eventTriggersForm.setValue(`${eventType}.enabled` as any, enabled);
    const success = await handleSaveEventTrigger(eventType);
    if (success) {
      toast.success(
        enabled ? t("Notification enabled") : t("Notification disabled"),
      );
    } else {
      // Revert if failed
      eventTriggersForm.setValue(`${eventType}.enabled` as any, !enabled);
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

  const onSaveExpiration = (data: z.infer<typeof ExpirationSettingsSchema>) => {
    if (program?.id) {
      updateProgramMutation.mutate({
        enablePointsExpiration: data.enabled,
        pointsExpirationMonths: data.months,
      });
    }
  };

  const handleResetPoints = () => {
    if (program?.id) {
      resetPointsMutation.mutate(program.id);
      setResetModalOpen(false);
    }
  };

  const handleDeleteProgram = () => {
    if (program?.id) {
      deleteProgramMutation.mutate({ programId: program.id, force: true });
      setDeleteModalOpen(false);
    }
  };

  if (isProgramLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

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
      <Tabs
        defaultValue={activeTab}
        className="w-full space-y-4"
        onValueChange={(value) => {
          router.push(`/dashboard/loyalty/settings?tab=${value}`);
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
              />

              <NotificationSettings
                form={notificationsForm}
                onSave={handleSaveNotifications}
              />

              <ReferralMessageSettings
                form={basicForm}
                onSave={onSaveBasicSettings}
                isPending={updateProgramMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PointsExpirationSettings
                form={expirationForm}
                onSave={onSaveExpiration}
                isPending={updateProgramMutation.isPending}
              />

              <DangerZone
                onReset={() => setResetModalOpen(true)}
                onDelete={() => setDeleteModalOpen(true)}
              />
            </div>
          </>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Form {...eventTriggersForm}>
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
              />

              <TierUpdateSettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSave={handleSaveTierUpgraded}
                isModified={tierUpgradedModified}
                onModify={() => setTierUpgradedModified(true)}
              />

              <PointsReminderSettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSave={handleSavePointsReminder}
                isModified={pointsReminderModified}
                onModify={() => setPointsReminderModified(true)}
              />

              <BirthdayReminderSettings
                form={eventTriggersForm}
                isPending={createTriggerMutation.isPending}
                onToggle={handleToggleEventTrigger}
                onSave={handleSaveBirthdayReminder}
                isModified={birthdayReminderModified}
                onModify={() => setBirthdayReminderModified(true)}
              />
            </div>
          </Form>
        </TabsContent>
      </Tabs>

      <ConfirmationModal
        opened={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        headerTitle={t("Reset Loyalty Points")}
        headerLabel={t(
          "Are you sure you want to reset all loyalty points? This action cannot be undone.",
        )}
        confirmLabel={t("Reset Points")}
        onConfirm={handleResetPoints}
        loading={resetPointsMutation.isPending}
      />

      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        headerTitle={t("Delete Loyalty Program")}
        headerLabel={t(
          "Are you sure you want to delete this loyalty program? All data will be permanently removed.",
        )}
        confirmLabel={t("Delete Program")}
        onConfirm={handleDeleteProgram}
        loading={deleteProgramMutation.isPending}
        forDeleteFunctionality={true}
      />
    </div>
  );
}
