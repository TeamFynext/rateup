import { create } from "zustand";
import { ChatFilter } from "../api/inbox/types";
import { persist } from "zustand/middleware";
import { deleteUploadedFiles } from "./fileUpload";

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


type WaMedia = {
  type: string;
  url: string;
  name: string;
  key: string;
};

interface MediaStore {
  media: WaMedia[];
  addMedia: (value: WaMedia) => void;
  resetMedia: () => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
  media: [],
  addMedia: (value) => set((state) => ({ media: [...state.media, value] })),
  resetMedia: () => set(() => ({ media: [] })),
}));




interface Message {
  id?: string;
  contactId: string;
  body: {
    text: string;
    url?: string;
    urlType?: string;
    filename?: string;
  };
  type: string;
  timestamp: number;
  isOutgoing: boolean;
}

interface MessageState {
  messages: Record<string, Message[]>;
  addMessage: (
    contactId: string,
    message: Omit<Message, "contactId" | "timestamp" | "isOutgoing">,
  ) => void;
  removeMessage: (contactId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  addMessage: (contactId, message) => {
    const newMsg: Message = {
      ...message,
      contactId,
      timestamp: Date.now(),
      isOutgoing: true,
    };
    const current = get().messages[contactId] || [];
    set({
      messages: {
        ...get().messages,
        [contactId]: [...current, newMsg],
      },
    });
  },
  removeMessage: (contactId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [contactId]: [],
      },
    })),
}));