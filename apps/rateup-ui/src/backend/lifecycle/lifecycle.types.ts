export type GetLabelsRes = {
  id: string;
  orgId: string;
  name: string;
  ordering: number;
  isDefault: boolean;
  category: string;
  emoji: string;
  description: string;
  isWon: boolean;
  createdAt: string;
  updatedAt: string;
};
export interface LifecycleStage {
  id?: string;
  name: string;
  ordering: number;
  isDefault: boolean;
  category: "active" | "won" | "lost";
  emoji: string;
  description: string;
  isWon: boolean;
  color: string;
}
