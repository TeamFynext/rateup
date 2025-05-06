import { create } from "zustand";
import { ChatFilter } from "../api/inbox/types";
import { persist } from "zustand/middleware";

type ChatState = {
  waAssignStatus: string;
  setWaAssignStatus: (status: string) => void;
};
type SelectedContactState = {
  selectedContactId: string | null;
  setSelectedContactId: (contactId: string) => void;
};

export const useChatAssignStatusStore = create<ChatState>((set: any) => ({
  waAssignStatus: "",
  setWaAssignStatus: (status: string) => set({ waAssignStatus: status }),
}));


export const useContactIdStore = create<SelectedContactState>((set:any)=>({
  selectedContactId:null,
  setSelectedContactId:(contactId:string)=> set({selectedContactId:contactId})
}))


type ChatFilterStore = {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
};

export const useChatFilterStore = create<ChatFilterStore>()(
  persist(
    (set, get) => ({
      filter: {
        messageType: "usermessages",
        strictFilter: false,
        searchTerm: "",
        contactGroups: [],
        campaigns: [],
        tags: [],
        waMessageAssignStatus: "New",
        blockedUsers: false,
        newStatuses: ["ASSIGNED", "UNASSIGNED"],
      },
      setFilter: (value) => set({ filter: value }),
    }),
    {
      name: "chat-filter-storage", // name of the item in the storage (must be unique)
    }
  )
);
