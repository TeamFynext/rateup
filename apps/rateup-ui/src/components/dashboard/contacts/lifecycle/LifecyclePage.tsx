// Extracted verbatim from the `/dashboard/contacts/lifecycle/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconActivity, IconAlertTriangle, IconPlus, IconSettings } from "@tabler/icons-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateLifeCycleMutation,
  useDeleteLifeCycleMutation,
  useLifecyclesWithContactCount,
  useReorderLifeCycleMutation,
  useUpdateLifeCycleMutation,
} from "@/backend/lifecycle/lifecycle.query";
import { useUpdateOrgDetailsMutation } from "@/backend/org/org.query";
import { useUserInfo } from "@/backend/user/user.query";
import {
  useSyncDatasetsMutation,
  useUpdateWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/context/confirm-provider";

import { FunnelVisualization } from "./parts/FunnelVisualization.tsx";
import { LifecycleStageCard } from "./parts/LifecycleStageCard.tsx";
import { SetupView } from "./parts/SetupView.tsx";
import { sortStages, transformToUIStage } from "./parts/shared.tsx";

export function ContactSettings() {
  const { t } = useTranslation("contacts.lifecycle");
  const { data: lifecycles, isLoading } = useLifecyclesWithContactCount();
  const confirm = useConfirm();
  const { data: userInfo } = useUserInfo();

  const { data: waSettingsData } = useWaSettings();
  const updateOrgDetails = useUpdateOrgDetailsMutation();
  const updateWaSettings = useUpdateWaSettingsMutation(waSettingsData?.[0]?.id ?? "");
  const syncDatasetsMutation = useSyncDatasetsMutation(waSettingsData?.[0]?.id || "");

  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isConversionApiActive, setIsConversionApiActive] = useState(false);
  const [conversionData, setConversionData] = useState<{
    event_name?: string;
    currency?: string;
    conversionsApiDatasetId?: string;
  }>({});

  React.useEffect(() => {
    if (userInfo && "data" in userInfo) {
      setShowStagesGlobal(userInfo.data.showLifecycle !== false);
      setIsConversionApiActive(userInfo.data.isConversionApiActive === true);
    }
  }, [userInfo]);

  React.useEffect(() => {
    if (waSettingsData && waSettingsData.length > 0) {
      setConversionData({
        event_name: waSettingsData[0].conversionData?.event_name || "Purchase",
        currency: waSettingsData[0].conversionData?.currency || "INR",
        conversionsApiDatasetId: waSettingsData[0].conversionsApiDatasetId || "",
      });
    }
  }, [waSettingsData]);

  const handleUpdateConversionApi = async (
    active: boolean,
    data: {
      event_name?: string;
      currency?: string;
      conversionsApiDatasetId?: string;
    },
  ) => {
    try {
      const finalData = { ...data };

      if (active !== isConversionApiActive) {
        await updateOrgDetails.mutateAsync({ isConversionApiActive: active });
        setIsConversionApiActive(active);

        if (active && waSettingsData?.[0]?.id && !finalData.conversionsApiDatasetId) {
          try {
            const datasets = await syncDatasetsMutation.mutateAsync();
            if (datasets && datasets.length > 0) {
              finalData.conversionsApiDatasetId = datasets[0].id;
              toast.success(t(`Auto-selected dataset: ${datasets[0].name}`));
            } else {
              toast.info(t("No Meta datasets found for this account."));
            }
          } catch {
            toast.error(t("Failed to auto-fetch Meta datasets."));
          }
        }
      }

      if (
        waSettingsData?.[0]?.id &&
        (finalData.event_name !== conversionData.event_name ||
          finalData.currency !== conversionData.currency ||
          finalData.conversionsApiDatasetId !== conversionData.conversionsApiDatasetId)
      ) {
        await updateWaSettings.mutateAsync({
          conversionData: {
            event_name: finalData.event_name,
            currency: finalData.currency,
          },
          conversionsApiDatasetId: finalData.conversionsApiDatasetId,
        });
        setConversionData(finalData);
      }
      toast.success(t("Settings saved successfully"));
    } catch {
      toast.error(t("Failed to save settings"));
    }
  };
  const [showStagesGlobal, setShowStagesGlobal] = useState(true);
  const [showAddActiveForm, setShowAddActiveForm] = useState(false);
  const [showAddLostForm, setShowAddLostForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addEmoji, setAddEmoji] = useState("🔹");
  const [addColor, setAddColor] = useState("bg-white");

  const createLifecycle = useCreateLifeCycleMutation();
  const updateLifecycle = useUpdateLifeCycleMutation();
  const deleteLifecycle = useDeleteLifeCycleMutation();
  const reorderLifecycle = useReorderLifeCycleMutation();

  const activeStages = useMemo(() => {
    if (!lifecycles) return [];
    return sortStages(
      lifecycles.filter((stage) => stage.category === "active" || stage.category === "won"),
    );
  }, [lifecycles]);

  const lostStages = useMemo(() => {
    if (!lifecycles) return [];
    return sortStages(lifecycles.filter((stage) => stage.category === "lost"));
  }, [lifecycles]);

  const uiStages = useMemo(() => activeStages.map(transformToUIStage), [activeStages]);
  const uiLostStages = useMemo(() => lostStages.map(transformToUIStage), [lostStages]);

  const allStages = useMemo(() => [...uiStages, ...uiLostStages], [uiStages, uiLostStages]);
  const totalContacts = useMemo(
    () => allStages.reduce((sum, stage) => sum + stage.count, 0),
    [allStages],
  );
  const funnelStages = useMemo(() => [...uiStages, ...uiLostStages], [uiStages, uiLostStages]);

  const getPercentage = (count: number) => {
    if (totalContacts === 0) return 0;
    return Math.round((count / totalContacts) * 100);
  };

  const resetAddForm = () => {
    setAddName("");
    setAddDesc("");
    setAddEmoji("🔹");
    setAddColor("bg-sky-400");
    setShowEmojiPicker(false);
  };

  const handleRenameStage = (id: string, newName: string) => {
    const stage = lifecycles?.find((item) => item.id === id);
    if (!stage || !newName.trim() || newName === stage.name) return;

    updateLifecycle.mutate({
      id,
      data: { ...stage, name: newName },
    });
  };

  const handleUpdateDescription = (id: string, newDesc: string) => {
    const stage = lifecycles?.find((item) => item.id === id);
    if (!stage || newDesc === stage.description) return;

    updateLifecycle.mutate({
      id,
      data: { ...stage, description: newDesc },
    });
  };

  const handleUpdateStageCategory = (id: string, category: "active" | "won") => {
    const stage = lifecycles?.find((item) => item.id === id);
    if (!stage || stage.category === "lost" || stage.category === category) {
      return;
    }

    if (stage.category === "won" && category === "active") {
      const wonStages = lifecycles?.filter((item) => item.category === "won") || [];
      if (wonStages.length === 1) {
        toast.error(t("Cannot change the last won stage. There must be at least one won stage."));
        return;
      }
    }

    updateLifecycle.mutate({
      id,
      data: {
        ...stage,
        category,
        isWon: category === "won",
      },
    });
  };

  const handleMoveStage = (index: number, direction: "up" | "down", isLost: boolean) => {
    const relevantStages = isLost ? lostStages : activeStages;
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= relevantStages.length) return;

    const reorderedStages = [...relevantStages];
    const currentStage = reorderedStages[index];
    reorderedStages[index] = reorderedStages[targetIndex];
    reorderedStages[targetIndex] = currentStage;

    reorderLifecycle.mutate(
      reorderedStages.map((stage, stageIndex) => ({
        ...stage,
        isDefault: stageIndex === 0 && !isLost,
        isWon: stageIndex === reorderedStages.length - 1 && !isLost, // Mark the last active stage as won
        ordering: stageIndex,
      })),
    );
  };

  const handleDeleteStage = async (id: string) => {
    const stage = lifecycles?.find((item) => item.id === id);
    if (!stage) return;

    if (stage.isDefault) {
      toast.error(t("Cannot delete default stage"));
      return;
    }

    if (stage.category === "won") {
      const wonStages = lifecycles?.filter((item) => item.category === "won") || [];
      if (wonStages.length === 1) {
        toast.error(t("Cannot delete the last won stage. There must be at least one won stage."));
        return;
      }
    }

    const shouldDelete = await confirm({
      title: t("Delete lifecycle stage?"),
      description: t(
        'This will permanently delete the stage "{name}". This action cannot be undone.',
        { name: stage.name },
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (!shouldDelete) return;

    deleteLifecycle.mutate(id);
  };

  const handleCreateStage = (isLost: boolean) => {
    if (!addName.trim()) {
      toast.error(t("Stage name is required"));
      return;
    }

    const currentStages = isLost ? lostStages : activeStages;
    const isFirstActiveStage = !isLost && activeStages.length === 0;
    let nextCategory: "active" | "won" | "lost" = "active";

    if (isLost) {
      nextCategory = "lost";
    } else if (isFirstActiveStage) {
      nextCategory = "won";
    }

    createLifecycle.mutate(
      {
        name: addName.trim(),
        ordering: currentStages.length,
        isDefault: isFirstActiveStage,
        category: nextCategory,
        emoji: addEmoji,
        description: addDesc.trim(),
        isWon: isFirstActiveStage,
        color: "#ffffff",
      },
      {
        onSuccess: () => {
          resetAddForm();
          setShowAddActiveForm(false);
          setShowAddLostForm(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <>
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      </>
    );
  }

  if ((!lifecycles || lifecycles.length === 0) && !isSettingUp) {
    return (
      <div className="grid h-full place-content-center py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <IconActivity className="size-12 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-medium text-foreground">{t("No lifecycle stages yet")}</h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "Create your first lifecycle stage to start tracking and managing customer journey.",
              )}
            </p>
          </div>
          <Button onClick={() => setIsSettingUp(true)}>
            <IconPlus data-icon="inline-start" />
            {t("Create Lifecycle Stage")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-8 p-6 pb-12">
        {!isSettingUp ? (
          <>
            <Card className="flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
              <div>
                <h1 className="text-[17px] font-bold leading-snug tracking-tight text-foreground">
                  {t("Lifecycle Management")}
                </h1>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {t("Track and manage customer journey across different lifecycle stages")}
                </p>
              </div>
              <Button
                onClick={() => setIsSettingUp(true)}
                className="rounded-xl px-4 py-2 text-xs font-bold"
              >
                <IconSettings data-icon="inline-start" />
                {t("Setup")}
              </Button>
            </Card>

            {!showStagesGlobal ? (
              <Alert className="rounded-2xl border-border bg-muted/30">
                <IconAlertTriangle className="size-5 text-muted-foreground" />
                <AlertDescription className="flex flex-col gap-3 text-center sm:text-left">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {t("Lifecycle Display is Hidden")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(
                        "You have disabled lifecycle stages visibility view. Go into Setup to show it again.",
                      )}
                    </p>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => setIsSettingUp(true)}
                    className="w-fit rounded-lg px-4 py-1.5 text-xs font-bold"
                  >
                    {t("Configure Setup")}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <section className="space-y-3">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                      {t("Lifecycle Stages")}
                    </h2>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t("Distribution of contacts across active journey stages")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {uiStages.map((stage) => (
                      <LifecycleStageCard
                        key={stage.id}
                        stage={stage}
                        pct={getPercentage(stage.count)}
                        isLost={false}
                      />
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                      {t("Lost Stages")}
                    </h2>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t("Distribution of contacts across different lost stages")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {uiLostStages.map((stage) => (
                      <LifecycleStageCard
                        key={stage.id}
                        stage={stage}
                        pct={getPercentage(stage.count)}
                        isLost={true}
                      />
                    ))}
                  </div>
                </section>

                <FunnelVisualization
                  stages={funnelStages}
                  totalContacts={totalContacts}
                  getPercentage={getPercentage}
                />
              </>
            )}
          </>
        ) : (
          <SetupView
            backendStages={lifecycles || []}
            showStagesGlobal={showStagesGlobal}
            setShowStagesGlobal={setShowStagesGlobal}
            isConversionApiActive={isConversionApiActive}
            conversionData={conversionData}
            handleUpdateConversionApi={handleUpdateConversionApi}
            hasWhatsAppSettings={
              userInfo && "data" in userInfo ? userInfo.data.hasWhatsAppSettings : false
            }
            showAddActiveForm={showAddActiveForm}
            setShowAddActiveForm={setShowAddActiveForm}
            showAddLostForm={showAddLostForm}
            setShowAddLostForm={setShowAddLostForm}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            addName={addName}
            setAddName={setAddName}
            addDesc={addDesc}
            setAddDesc={setAddDesc}
            addEmoji={addEmoji}
            setAddEmoji={setAddEmoji}
            addColor={addColor}
            setAddColor={setAddColor}
            handleCreateStage={handleCreateStage}
            handleRenameStage={handleRenameStage}
            handleUpdateDescription={handleUpdateDescription}
            handleUpdateStageCategory={handleUpdateStageCategory}
            handleDeleteStage={handleDeleteStage}
            handleMoveStage={handleMoveStage}
            setIsSettingUp={setIsSettingUp}
            isCreating={createLifecycle.isPending}
            isReordering={reorderLifecycle.isPending}
          />
        )}
      </div>
    </ScrollArea>
  );
}
