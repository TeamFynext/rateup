// Extracted verbatim from `LifecyclePage.tsx`. Behaviour is unchanged.

import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconGripVertical,
  IconPlus,
  IconStack2,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";
import React from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { EMOJI_PRESETS, getStageToneStyle, sortStages } from "./shared.tsx";
import type { AddStageFormProps, SetupViewProps, StageListItemProps } from "./shared.tsx";

export function SetupView({
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
    () => sortStages(backendStages.filter((stage) => stage.category !== "lost")),
    [backendStages],
  );
  const lostStages = useMemo(
    () => sortStages(backendStages.filter((stage) => stage.category === "lost")),
    [backendStages],
  );
  const [visibleDescriptions, setVisibleDescriptions] = useState<Record<string, boolean>>({});

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
        <Switch checked={showStagesGlobal} onCheckedChange={setShowStagesGlobal} />
      </Card>

      {/* The Meta Conversions API card moved to pipeline settings, above the
          danger zone: a win is now a lead reaching a Won column, not a lifecycle
          flag, so the setting belongs with the board that decides it. */}

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
                  onMoveStage={(direction) => handleMoveStage(index, direction, false)}
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
                <IconPlus className="size-3.5" />
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
                  onMoveStage={(direction) => handleMoveStage(index, direction, true)}
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
                <IconPlus className="size-3.5" />
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
            <span>{t("Stages created are available instantly in active pipelines.")}</span>
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

export function StageListItem({
  stage,
  stageIndex,
  stageCount,
  onRename,
  onDeleteStage,
  onUpdateDescription,
  onMoveStage,
  visibleDescription,
  onToggleDescription,
  canDelete,
  isReordering,
}: Readonly<StageListItemProps>) {
  const { t } = useTranslation("contacts.lifecycle");
  const [nameDraft, setNameDraft] = useState(stage.name);
  const [descriptionDraft, setDescriptionDraft] = useState(stage.description || "");

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
          <IconGripVertical className="size-3.5" />
        </div>

        <div
          className="flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white shadow-sm"
          style={getStageToneStyle(stage.color)}
        >
          <span>{stage.emoji || (stage.category === "lost" ? "🛑" : "🔹")}</span>
        </div>

        <div className="flex-1">
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => onRename(nameDraft)}
            placeholder={stage.category === "lost" ? t("Lost stage name") : t("Stage title")}
            className="h-auto border-0 border-transparent bg-transparent px-0.5 py-0.5 text-xs font-bold text-foreground shadow-none hover:border-border focus-visible:border-ring focus-visible:ring-0"
          />
          <span className="block text-[9px] font-bold text-muted-foreground">
            {t("Stage {number}", { number: stageIndex + 1 })}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {stage.isDefault ? (
            <Badge variant="secondary" className="rounded px-1.5 py-0.5 text-[9px] font-extrabold">
              {t("Default")}
            </Badge>
          ) : null}
          {stage.category === "won" ? (
            <Badge variant="default" className="rounded px-1.5 py-0.5 text-[9px] font-extrabold">
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
            <IconTrash className="size-3.5" />
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
            <IconArrowUp className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={stageIndex === stageCount - 1 || isReordering}
            onClick={() => onMoveStage("down")}
            className="size-5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
          >
            <IconArrowDown className="size-3" />
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

export function AddStageForm({
  addName,
  setAddName,
  addDesc,
  setAddDesc,
  addEmoji,
  setAddEmoji,
  addColor,
  showEmojiPicker,
  setShowEmojiPicker,
  onCancel,
  onCreate,
  isLost,
  isCreating,
}: Readonly<AddStageFormProps>) {
  const uid = useId();
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
          <IconStack2 className={cn("size-3", isLost ? "text-destructive" : "text-primary")} />
          {isLost ? t("Add Lost Stage") : t("Add Lifecycle Stage")}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="size-6 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <IconX className="size-3" />
        </Button>
      </div>

      <Field>
        <FieldLabel
          htmlFor={`${uid}-field-4`}
          className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground"
        >
          {t("Name")}
        </FieldLabel>
        <Input
          id={`${uid}-field-4`}
          placeholder={isLost ? t("Enter name. eg: Lost") : t("Enter name. eg: New Lead")}
          value={addName}
          onChange={(event) => setAddName(event.target.value)}
          className="border-input bg-background text-xs font-semibold text-foreground"
        />
      </Field>

      <Field>
        <FieldLabel
          htmlFor={`${uid}-field-5`}
          className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground"
        >
          {t("Description")}
        </FieldLabel>
        <Input
          id={`${uid}-field-5`}
          placeholder={t("Enter description")}
          value={addDesc}
          onChange={(event) => setAddDesc(event.target.value)}
          className="border-input bg-background text-xs font-semibold text-foreground"
        />
      </Field>

      <div className="relative space-y-1.5">
        <FieldTitle className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("Emoji Icon")}
        </FieldTitle>

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
              <IconChevronDown className="size-3" />
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
          {isCreating ? <Spinner data-icon="inline-start" /> : <IconCheck className="size-3" />}
          <span>{isCreating ? t("Adding...") : t("Add Stage")}</span>
        </Button>
      </div>
    </div>
  );
}

export function EmojiPicker({
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
                addEmoji === emojiOption && "bg-muted font-bold ring-1 ring-border",
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
