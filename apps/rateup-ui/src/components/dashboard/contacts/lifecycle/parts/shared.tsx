// Shared helpers for the modules in `./`.
// Extracted verbatim from `LifecyclePage.tsx`. Behaviour is unchanged.

import type { LifecycleWithContactCount } from "@/backend/lifecycle/lifecycle.types";

export const EMOJI_PRESETS = [
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

// The shape the lifecycles-with-contact-count endpoint returns.
export type BackendLifecycleStage = LifecycleWithContactCount;

export interface UILifecycleStage {
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

export interface SetupViewProps {
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
  readonly handleUpdateStageCategory: (id: string, category: "active" | "won") => void;
  readonly handleDeleteStage: (id: string) => void;
  readonly handleMoveStage: (index: number, direction: "up" | "down", isLost: boolean) => void;
  readonly setIsSettingUp: (show: boolean) => void;
  readonly isCreating: boolean;
  readonly isReordering: boolean;
}

export interface StageListItemProps {
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

export interface AddStageFormProps {
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

export const sortStages = (stages: BackendLifecycleStage[]) =>
  [...stages].sort((a, b) => a.ordering - b.ordering);

export const transformToUIStage = (backendStage: BackendLifecycleStage): UILifecycleStage => ({
  id: backendStage.id,
  name: backendStage.name,
  count: backendStage._count.contacts,
  color: backendStage.color || "#0ea5e9",
  emoji: backendStage.emoji || "🔹",
  statusBadge: backendStage.category,
  statusBadgeType:
    backendStage.category === "won" ? "won" : backendStage.category === "lost" ? "lost" : "active",
  isDefault: backendStage.isDefault,
  description: backendStage.description || "",
});

export const getStageToneStyle = (color: string): React.CSSProperties => ({
  backgroundColor: color || "#0ea5e9",
});

export const getProgressToneStyle = (color: string, isLost: boolean): React.CSSProperties => ({
  backgroundColor: isLost ? "#f43f5e" : color || "#0ea5e9",
});
