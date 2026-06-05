"use client";

import * as React from "react";
import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  GripVertical,
  Layers,
  Minus,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  useCreateLifeCycleMutation,
  useDeleteLifeCycleMutation,
  useLifecyclesWithContactCount,
  useReorderLifeCycleMutation,
  useUpdateLifeCycleMutation,
} from "@/backend/lifecycle/lifecycle.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/contacts/lifecycle/")({
  component: ContactSettings,
});

const EMOJI_PRESETS = [
  "🔹",
  "🔥",
  "🏆",
  "💎",
  "🚀",
  "🌟",
  "🤝",
  "⚡",
  "📝",
  "🌀",
  "🛑",
  "⚠️",
  "🎯",
  "📂",
];

interface BackendLifecycleStage {
  id: string;
  name: string;
  ordering: number;
  isDefault: boolean;
  category: "active" | "won" | "lost";
  emoji: string;
  description: string;
  isWon: boolean;
  color: string;
  _count: {
    contacts: number;
  };
}

interface UILifecycleStage {
  id: string;
  name: string;
  count: number;
  color: string;
  statusBadge: string;
  statusBadgeType: "active" | "won" | "lost";
  isDefault: boolean;
  description: string;
  emoji: string;
}

interface SetupViewProps {
  readonly backendStages: BackendLifecycleStage[];
  readonly showStagesGlobal: boolean;
  readonly setShowStagesGlobal: (show: boolean) => void;
  readonly showAddActiveForm: boolean;
  readonly setShowAddActiveForm: (show: boolean) => void;
  readonly showAddLostForm: boolean;
  readonly setShowAddLostForm: (show: boolean) => void;
  readonly showEmojiPicker: boolean;
  readonly setShowEmojiPicker: (show: boolean) => void;
  readonly addName: string;
  readonly setAddName: (name: string) => void;
  readonly addDesc: string;
  readonly setAddDesc: (desc: string) => void;
  readonly addEmoji: string;
  readonly setAddEmoji: (emoji: string) => void;
  readonly addColor: string;
  readonly setAddColor: (color: string) => void;
  readonly handleCreateStage: (isLost: boolean) => void;
  readonly handleRenameStage: (id: string, newName: string) => void;
  readonly handleUpdateDescription: (id: string, newDesc: string) => void;
  readonly handleUpdateStageCategory: (
    id: string,
    category: "active" | "won",
  ) => void;
  readonly handleDeleteStage: (id: string) => void;
  readonly handleMoveStage: (
    index: number,
    direction: "up" | "down",
    isLost: boolean,
  ) => void;
  readonly setIsSettingUp: (show: boolean) => void;
  readonly isCreating: boolean;
  readonly isReordering: boolean;
}

interface StageListItemProps {
  readonly stage: BackendLifecycleStage;
  readonly stageIndex: number;
  readonly stageCount: number;
  readonly onRename: (newName: string) => void;
  readonly onDeleteStage: () => void;
  readonly onUpdateDescription: (desc: string) => void;
  readonly onUpdateStageCategory: (category: "active" | "won") => void;
  readonly onMoveStage: (direction: "up" | "down") => void;
  readonly visibleDescription: boolean;
  readonly onToggleDescription: () => void;
  readonly canDelete: boolean;
  readonly isReordering: boolean;
}

interface AddStageFormProps {
  readonly addName: string;
  readonly setAddName: (name: string) => void;
  readonly addDesc: string;
  readonly setAddDesc: (desc: string) => void;
  readonly addEmoji: string;
  readonly setAddEmoji: (emoji: string) => void;
  readonly addColor: string;
  readonly setAddColor: (color: string) => void;
  readonly showEmojiPicker: boolean;
  readonly setShowEmojiPicker: (show: boolean) => void;
  readonly onCancel: () => void;
  readonly onCreate: () => void;
  readonly isLost: boolean;
  readonly isCreating: boolean;
}

interface EmojiColorPickerProps {
  readonly addColor: string;
  readonly setAddColor: (color: string) => void;
  readonly addEmoji: string;
  readonly setAddEmoji: (emoji: string) => void;
  readonly onDone: () => void;
  readonly isLost: boolean;
}

const sortStages = (stages: BackendLifecycleStage[]) =>
  [...stages].sort((a, b) => a.ordering - b.ordering);

const transformToUIStage = (
  backendStage: BackendLifecycleStage,
): UILifecycleStage => ({
  id: backendStage.id,
  name: backendStage.name,
  count: backendStage._count.contacts,
  color: backendStage.color || "#0ea5e9",
  emoji: backendStage.emoji || "🔹",
  statusBadge: backendStage.category,
  statusBadgeType:
    backendStage.category === "won"
      ? "won"
      : backendStage.category === "lost"
        ? "lost"
        : "active",
  isDefault: backendStage.isDefault,
  description: backendStage.description || "",
});

const getStageToneStyle = (color: string): React.CSSProperties => ({
  backgroundColor: color || "#0ea5e9",
});

const getProgressToneStyle = (
  color: string,
  isLost: boolean,
): React.CSSProperties => ({
  backgroundColor: isLost ? "#f43f5e" : color || "#0ea5e9",
});

function ContactSettings() {
  const { t } = useTranslation("contacts.lifecycle");
  const { data: lifecycles, isLoading } = useLifecyclesWithContactCount();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [isSettingUp, setIsSettingUp] = useState(false);
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
      lifecycles.filter(
        (stage) => stage.category === "active" || stage.category === "won",
      ),
    );
  }, [lifecycles]);

  const lostStages = useMemo(() => {
    if (!lifecycles) return [];
    return sortStages(lifecycles.filter((stage) => stage.category === "lost"));
  }, [lifecycles]);

  const uiStages = useMemo(
    () => activeStages.map(transformToUIStage),
    [activeStages],
  );
  const uiLostStages = useMemo(
    () => lostStages.map(transformToUIStage),
    [lostStages],
  );

  const allStages = useMemo(
    () => [...uiStages, ...uiLostStages],
    [uiStages, uiLostStages],
  );
  const totalContacts = useMemo(
    () => allStages.reduce((sum, stage) => sum + stage.count, 0),
    [allStages],
  );
  const funnelStages = useMemo(
    () => [...uiStages, ...uiLostStages],
    [uiStages, uiLostStages],
  );

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

  const handleAdjustCount = () => {
    toast.info(t("Contact counts are derived from contact assignments."));
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

  const handleUpdateStageCategory = (
    id: string,
    category: "active" | "won",
  ) => {
    const stage = lifecycles?.find((item) => item.id === id);
    if (!stage || stage.category === "lost" || stage.category === category) {
      return;
    }

    if (stage.category === "won" && category === "active") {
      const wonStages =
        lifecycles?.filter((item) => item.category === "won") || [];
      if (wonStages.length === 1) {
        toast.error(
          t(
            "Cannot change the last won stage. There must be at least one won stage.",
          ),
        );
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

  const handleMoveStage = (
    index: number,
    direction: "up" | "down",
    isLost: boolean,
  ) => {
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
      const wonStages =
        lifecycles?.filter((item) => item.category === "won") || [];
      if (wonStages.length === 1) {
        toast.error(
          t(
            "Cannot delete the last won stage. There must be at least one won stage.",
          ),
        );
        return;
      }
    }

    const shouldDelete = await confirm({
      title: t("Delete lifecycle stage?"),
      description: t(
        'This will permanently delete the stage "{name}". This action cannot be undone.',
        { name: stage.name },
      ),
      confirmLabel: t("Delete"),
      cancelLabel: t("Cancel"),
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
        <ConfirmDialog />
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      </>
    );
  }

  if ((!lifecycles || lifecycles.length === 0) && !isSettingUp) {
    return (
      <>
        <ConfirmDialog />
        <div className="grid h-full place-content-center py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Activity className="size-12 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium text-foreground">
                {t("No lifecycle stages yet")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Create your first lifecycle stage to start tracking and managing customer journey.",
                )}
              </p>
            </div>
            <Button onClick={() => setIsSettingUp(true)}>
              <Plus data-icon="inline-start" />
              {t("Create Lifecycle Stage")}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ConfirmDialog />
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
                    {t(
                      "Track and manage customer journey across different lifecycle stages",
                    )}
                  </p>
                </div>
                <Button
                  onClick={() => setIsSettingUp(true)}
                  className="rounded-xl px-4 py-2 text-xs font-bold"
                >
                  <Settings data-icon="inline-start" />
                  {t("Setup")}
                </Button>
              </Card>

              {!showStagesGlobal ? (
                <Alert className="rounded-2xl border-border bg-muted/30">
                  <AlertTriangle className="size-5 text-muted-foreground" />
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
                        {t(
                          "Distribution of contacts across active journey stages",
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {uiStages.map((stage) => (
                        <LifecycleStageCard
                          key={stage.id}
                          stage={stage}
                          pct={getPercentage(stage.count)}
                          onAdjustCount={handleAdjustCount}
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
                        {t(
                          "Distribution of contacts across different lost stages",
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {uiLostStages.map((stage) => (
                        <LifecycleStageCard
                          key={stage.id}
                          stage={stage}
                          pct={getPercentage(stage.count)}
                          onAdjustCount={handleAdjustCount}
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
    </>
  );
}

function LifecycleStageCard({
  stage,
  pct,
  onAdjustCount,
  isLost,
}: Readonly<{
  stage: UILifecycleStage;
  pct: number;
  onAdjustCount: () => void;
  isLost: boolean;
}>) {
  const { t } = useTranslation("contacts.lifecycle");
  return (
    <Card className="group relative flex flex-col justify-between p-3.5 shadow-sm transition-all hover:border-border gap-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white shadow-sm"
            style={getStageToneStyle(stage.color)}
          >
            <span>{stage.emoji || (isLost ? "🛑" : "🔹")}</span>
          </div>
          <h3 className="max-w-30 truncate text-[12px] font-bold tracking-tight text-foreground">
            {stage.name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
              isLost
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : stage.statusBadgeType === "won"
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-secondary bg-secondary text-secondary-foreground",
            )}
          >
            {isLost ? "🛑 " : stage.statusBadgeType === "won" ? "🏆 " : ""}
            {stage.statusBadge}
          </Badge>
          {stage.isDefault ? (
            <Badge
              variant="secondary"
              className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
            >
              Default
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-2xl font-black leading-none tracking-tight text-foreground">
          {stage.count}
        </div>

        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onAdjustCount}
            className="size-5 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            title="Decrease"
          >
            <Minus className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onAdjustCount}
            className="size-5 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            title="Increase"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-extrabold text-muted-foreground">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
            {isLost ? t("Lost Lead") : t("Share")}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              ...getProgressToneStyle(stage.color, isLost),
              width: `${pct}%`,
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function FunnelVisualization({
  stages,
  totalContacts,
  getPercentage,
}: Readonly<{
  stages: UILifecycleStage[];
  totalContacts: number;
  getPercentage: (count: number) => number;
}>) {
  const { t } = useTranslation("contacts.lifecycle");
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            {t("Customer Journey Funnel")}
          </h2>
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("Visualize how contacts progress through your customer journey")}
          </p>
        </div>

        <div className="hidden items-center gap-4 rounded-xl border border-border bg-card px-3 py-1 text-[10px] font-bold text-muted-foreground sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            <span>
              {t("Total Funnel Depth: {count}", { count: totalContacts })}
            </span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="uppercase tracking-widest text-primary">
            {t("Live Flow Sync")}
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="relative space-y-6">
            <div className="absolute bottom-4 left-5 top-4 hidden w-0.5 border-l-2 border-dashed border-border md:block" />

            {stages.map((stage, index) => {
              const pct = getPercentage(stage.count);
              const previousStage = index > 0 ? stages[index - 1] : null;
              const width = `${Math.max(55, 100 - index * 15)}%`;
              const dropoffPercent = previousStage?.count
                ? Math.max(
                    0,
                    Math.round(
                      ((previousStage.count - stage.count) /
                        previousStage.count) *
                        100,
                    ),
                  )
                : 0;

              return (
                <div
                  key={stage.id}
                  className="group relative z-10 flex flex-col gap-4 md:flex-row md:items-center"
                >
                  <div className="hidden w-10 shrink-0 items-center justify-center md:flex">
                    <div className="flex size-6 items-center justify-center rounded-full border-2 border-border bg-muted text-[10px] font-black text-muted-foreground transition-all group-hover:border-primary group-hover:text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="w-28 shrink-0">
                    <span className="text-[12px] font-black tracking-tight text-foreground">
                      {stage.name}
                    </span>
                  </div>

                  <div className="relative flex min-h-12 flex-1 items-center">
                    <div
                      className="relative flex h-12 items-center justify-between overflow-hidden rounded-xl border border-border bg-muted/40 px-4 text-foreground shadow-sm transition-all duration-300 hover:translate-x-1"
                      style={{ width }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-background/40 backdrop-blur-[1px] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative z-10 flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={getStageToneStyle(stage.color)}
                        />
                        <span className="text-[12px] font-black tracking-tight">
                          {stage.count} contacts
                        </span>
                      </div>
                      <div className="relative z-10 flex items-center gap-3">
                        <span className="rounded-md border border-border bg-background/80 px-2 py-0.5 text-[11px] font-black text-foreground shadow-sm">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center md:w-32 md:justify-end">
                    {/* {previousStage ? (
                      <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1 text-[10px] font-bold text-muted-foreground md:w-auto">
                        <span
                          className={
                            dropoffPercent > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {dropoffPercent > 0
                            ? `↓ ${dropoffPercent}% Drop`
                            : "→ No Drop"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-extrabold text-primary md:w-auto">
                        <span>🎯 Source</span>
                      </div>
                    )} */}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function SetupView({
  backendStages,
  showStagesGlobal,
  setShowStagesGlobal,
  showAddActiveForm,
  setShowAddActiveForm,
  showAddLostForm,
  setShowAddLostForm,
  showEmojiPicker,
  setShowEmojiPicker,
  addName,
  setAddName,
  addDesc,
  setAddDesc,
  addEmoji,
  setAddEmoji,
  addColor,
  setAddColor,
  handleCreateStage,
  handleRenameStage,
  handleUpdateDescription,
  handleUpdateStageCategory,
  handleDeleteStage,
  handleMoveStage,
  setIsSettingUp,
  isCreating,
  isReordering,
}: Readonly<SetupViewProps>) {
  const { t } = useTranslation("contacts.lifecycle");
  const stages = useMemo(
    () =>
      sortStages(backendStages.filter((stage) => stage.category !== "lost")),
    [backendStages],
  );
  const lostStages = useMemo(
    () =>
      sortStages(backendStages.filter((stage) => stage.category === "lost")),
    [backendStages],
  );
  const [visibleDescriptions, setVisibleDescriptions] = useState<
    Record<string, boolean>
  >({});

  const toggleDescription = (id: string) => {
    setVisibleDescriptions((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            {t("Show/Hide Lifecycle Stages")}
          </h3>
          <p className="mt-1 max-w-4xl text-xs font-medium leading-relaxed text-muted-foreground">
            {t(
              "Display Lifecycle Stages in the Inbox and Contacts modules. Disabling this only hides the stages. Your contact data remains safe and unchanged.",
            )}
          </p>
        </div>
        <Switch
          checked={showStagesGlobal}
          onCheckedChange={setShowStagesGlobal}
        />
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <CardTitle className="text-[15px] font-bold tracking-tight text-foreground">
            {t("Set up Lifecycle Stages")}
          </CardTitle>
          <Button
            variant="ghost"
            onClick={() => setIsSettingUp(false)}
            className="rounded-lg px-4 py-1.5 text-xs font-bold text-muted-foreground"
          >
            {t("Cancel")}
          </Button>
        </CardHeader>

        <div className="grid min-h-125 grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-6 p-6">
            <div className="rounded-xl border border-emerald-100/60 bg-emerald-50/50 p-4">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-emerald-800">
                {t("Lifecycle Stages")}
              </h4>
              <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-emerald-600">
                {t(
                  "Organize and track contacts through key stages of their journey. A default inbox filter will be created in the Inbox module.",
                )}
              </p>
            </div>

            <div className="space-y-4">
              {stages.map((stage, index) => (
                <StageListItem
                  key={stage.id}
                  stage={stage}
                  stageIndex={index}
                  stageCount={stages.length}
                  onRename={(newName) => handleRenameStage(stage.id, newName)}
                  onDeleteStage={() => {
                    void handleDeleteStage(stage.id);
                  }}
                  onUpdateDescription={(description) =>
                    handleUpdateDescription(stage.id, description)
                  }
                  onUpdateStageCategory={(category) =>
                    handleUpdateStageCategory(stage.id, category)
                  }
                  onMoveStage={(direction) =>
                    handleMoveStage(index, direction, false)
                  }
                  visibleDescription={visibleDescriptions[stage.id] || false}
                  onToggleDescription={() => toggleDescription(stage.id)}
                  canDelete={!stage.isDefault}
                  isReordering={isReordering}
                />
              ))}
            </div>

            {!showAddActiveForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddActiveForm(true);
                  setShowAddLostForm(false);
                  setShowEmojiPicker(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-background py-2.5 text-xs font-bold text-muted-foreground"
              >
                <Plus className="size-3.5" />
                <span>{t("Add Stage")}</span>
              </Button>
            ) : (
              <AddStageForm
                addName={addName}
                setAddName={setAddName}
                addDesc={addDesc}
                setAddDesc={setAddDesc}
                addEmoji={addEmoji}
                setAddEmoji={setAddEmoji}
                addColor={addColor}
                setAddColor={setAddColor}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                onCancel={() => {
                  setShowAddActiveForm(false);
                  setShowEmojiPicker(false);
                }}
                onCreate={() => handleCreateStage(false)}
                isLost={false}
                isCreating={isCreating}
              />
            )}
          </div>

          <div className="space-y-6 bg-muted/20 p-6">
            <div className="rounded-xl border border-rose-100/60 bg-rose-50/50 p-4">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-rose-800">
                {t("Lost Stages")}
              </h4>
              <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-rose-600">
                {t(
                  "Track where contacts go after exiting your sales process. No default inbox filter will be created in the Inbox module for lost stages.",
                )}
              </p>
            </div>

            <div className="space-y-4">
              {lostStages.map((stage, index) => (
                <StageListItem
                  key={stage.id}
                  stage={stage}
                  stageIndex={index}
                  stageCount={lostStages.length}
                  onRename={(newName) => handleRenameStage(stage.id, newName)}
                  onDeleteStage={() => {
                    void handleDeleteStage(stage.id);
                  }}
                  onUpdateDescription={(description) =>
                    handleUpdateDescription(stage.id, description)
                  }
                  onUpdateStageCategory={() => undefined}
                  onMoveStage={(direction) =>
                    handleMoveStage(index, direction, true)
                  }
                  visibleDescription={visibleDescriptions[stage.id] || false}
                  onToggleDescription={() => toggleDescription(stage.id)}
                  canDelete={!stage.isDefault}
                  isReordering={isReordering}
                />
              ))}
            </div>

            {!showAddLostForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddLostForm(true);
                  setShowAddActiveForm(false);
                  setShowEmojiPicker(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-background py-2.5 text-xs font-bold text-muted-foreground"
              >
                <Plus className="size-3.5" />
                <span>{t("Add Stage")}</span>
              </Button>
            ) : (
              <AddStageForm
                addName={addName}
                setAddName={setAddName}
                addDesc={addDesc}
                setAddDesc={setAddDesc}
                addEmoji={addEmoji}
                setAddEmoji={setAddEmoji}
                addColor={addColor}
                setAddColor={setAddColor}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                onCancel={() => {
                  setShowAddLostForm(false);
                  setShowEmojiPicker(false);
                }}
                onCreate={() => handleCreateStage(true)}
                isLost={true}
                isCreating={isCreating}
              />
            )}
          </div>
        </div>

        <CardFooter className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <p className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <span>💡</span>
            <span>
              {t("Stages created are available instantly in active pipelines.")}
            </span>
          </p>
          <Button
            onClick={() => setIsSettingUp(false)}
            className="rounded-xl px-5 py-2 text-xs font-bold"
          >
            {t("Save & Return")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function StageListItem({
  stage,
  stageIndex,
  stageCount,
  onRename,
  onDeleteStage,
  onUpdateDescription,
  onUpdateStageCategory,
  onMoveStage,
  visibleDescription,
  onToggleDescription,
  canDelete,
  isReordering,
}: Readonly<StageListItemProps>) {
  const { t } = useTranslation("contacts.lifecycle");
  const [nameDraft, setNameDraft] = useState(stage.name);
  const [descriptionDraft, setDescriptionDraft] = useState(
    stage.description || "",
  );

  React.useEffect(() => {
    setNameDraft(stage.name);
  }, [stage.name]);

  React.useEffect(() => {
    setDescriptionDraft(stage.description || "");
  }, [stage.description]);

  return (
    <Card className="bg-muted/40 p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex shrink-0 items-center text-muted-foreground">
          <GripVertical className="size-3.5" />
        </div>

        <div
          className="flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white shadow-sm"
          style={getStageToneStyle(stage.color)}
        >
          <span>
            {stage.emoji || (stage.category === "lost" ? "🛑" : "🔹")}
          </span>
        </div>

        <div className="flex-1">
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => onRename(nameDraft)}
            placeholder={
              stage.category === "lost"
                ? t("Lost stage name")
                : t("Stage title")
            }
            className="h-auto border-0 border-transparent bg-transparent px-0.5 py-0.5 text-xs font-bold text-foreground shadow-none hover:border-border focus-visible:border-ring focus-visible:ring-0"
          />
          <span className="block text-[9px] font-bold text-muted-foreground">
            {t("Stage {number}", { number: stageIndex + 1 })}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {stage.isDefault ? (
            <Badge
              variant="secondary"
              className="rounded px-1.5 py-0.5 text-[9px] font-extrabold"
            >
              {t("Default")}
            </Badge>
          ) : null}
          {stage.category === "won" ? (
            <Badge
              variant="default"
              className="rounded px-1.5 py-0.5 text-[9px] font-extrabold"
            >
              {t("Won stage")}
            </Badge>
          ) : null}
        </div>

        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDeleteStage}
            className="size-6 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            title={t("Delete stage")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}

        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-background p-0.5 shadow-xs">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={stageIndex === 0 || isReordering}
            onClick={() => onMoveStage("up")}
            className="size-5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
          >
            <ArrowUp className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={stageIndex === stageCount - 1 || isReordering}
            onClick={() => onMoveStage("down")}
            className="size-5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
          >
            <ArrowDown className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 pl-8">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onToggleDescription}
          className="h-auto justify-start p-0 text-left text-[10px] font-extrabold text-primary hover:underline"
        >
          {visibleDescription ? t("Hide description") : t("Show description")}
        </Button>

        {visibleDescription ? (
          <Textarea
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onBlur={() => onUpdateDescription(descriptionDraft)}
            placeholder={t("Enter stage description details...")}
            className="h-14 resize-none border-input bg-background text-xs font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
        ) : null}
      </div>
    </Card>
  );
}

function AddStageForm({
  addName,
  setAddName,
  addDesc,
  setAddDesc,
  addEmoji,
  setAddEmoji,
  addColor,
  setAddColor,
  showEmojiPicker,
  setShowEmojiPicker,
  onCancel,
  onCreate,
  isLost,
  isCreating,
}: Readonly<AddStageFormProps>) {
  const { t } = useTranslation("contacts.lifecycle");
  return (
    <div
      className={cn(
        "relative space-y-3.5 rounded-xl border bg-muted/30 p-4",
        isLost ? "border-destructive/20" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1 text-[12px] font-black tracking-tight text-foreground">
          <Layers
            className={cn(
              "size-3",
              isLost ? "text-destructive" : "text-primary",
            )}
          />
          {isLost ? t("Add Lost Stage") : t("Add Lifecycle Stage")}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="size-6 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("Name")}
        </Label>
        <Input
          placeholder={
            isLost ? t("Enter name. eg: Lost") : t("Enter name. eg: New Lead")
          }
          value={addName}
          onChange={(event) => setAddName(event.target.value)}
          className="border-input bg-background text-xs font-semibold text-foreground"
        />
      </div>

      <div className="space-y-1">
        <Label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("Description")}
        </Label>
        <Input
          placeholder={t("Enter description")}
          value={addDesc}
          onChange={(event) => setAddDesc(event.target.value)}
          className="border-input bg-background text-xs font-semibold text-foreground"
        />
      </div>

      <div className="relative space-y-1.5">
        <Label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("Emoji Icon")}
        </Label>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border border-transparent text-lg text-white shadow-xs transition-all focus-visible:outline-none focus-visible:ring-1",
              addColor,
              "focus-visible:ring-ring",
            )}
            title="Click to select emoji and color"
          >
            <span>{addEmoji}</span>
          </Button>

          <div className="text-xs font-bold text-muted-foreground">
            <div>{t("Selected emoji")}</div>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="mt-0.5 h-auto p-0 text-[10px] font-extrabold text-primary hover:underline"
            >
              <span>{t("Customize")}</span>
              <ChevronDown className="size-3" />
            </Button>
          </div>
        </div>
        {showEmojiPicker ? (
          <EmojiPicker
            addEmoji={addEmoji}
            setAddEmoji={setAddEmoji}
            onDone={() => setShowEmojiPicker(false)}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("Cancel")}
        </Button>
        <Button
          type="button"
          variant={isLost ? "destructive" : "default"}
          onClick={onCreate}
          disabled={isCreating || !addName.trim()}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Check className="size-3" />
          )}
          <span>{isCreating ? t("Adding...") : t("Add Stage")}</span>
        </Button>
      </div>
    </div>
  );
}

function EmojiPicker({
  addEmoji,
  setAddEmoji,
  onDone,
}: Readonly<{
  addEmoji: string;
  setAddEmoji: (emoji: string) => void;
  onDone: () => void;
}>) {
  const { t } = useTranslation("contacts.lifecycle");

  return (
    <div className="absolute left-0 top-12 z-40 w-full space-y-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl sm:w-72">
      <div className="space-y-1.5">
        <span className="block text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          {t("Emoji Symbol")}
        </span>

        <div className="grid grid-cols-7 gap-1.5">
          {EMOJI_PRESETS.map((emojiOption) => (
            <Button
              key={emojiOption}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setAddEmoji(emojiOption)}
              className={cn(
                "flex size-7 items-center justify-center rounded text-xs transition-transform hover:scale-110 hover:bg-muted",
                addEmoji === emojiOption &&
                  "bg-muted font-bold ring-1 ring-border",
              )}
            >
              {emojiOption}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onDone}
        className="w-full rounded-lg py-1 text-[10px] font-extrabold"
      >
        {t("Done")}
      </Button>
    </div>
  );
}
