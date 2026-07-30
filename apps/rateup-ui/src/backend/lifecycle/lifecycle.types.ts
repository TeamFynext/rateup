export interface GetLabelsRes {
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
}

/** A lifecycle stage plus the number of contacts currently sitting in it. */
export interface LifecycleWithContactCount {
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
