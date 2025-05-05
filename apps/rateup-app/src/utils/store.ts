import { create } from "zustand";

type ChatState = {
  waAssignStatus: string;
  setWaAssignStatus: (status: string) => void;
};

export const useChatAssignStatusStore = create<ChatState>((set: any) => ({
  waAssignStatus: "",
  setWaAssignStatus: (status: string) => set({ waAssignStatus: status }),
}));
