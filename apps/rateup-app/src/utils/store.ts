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
type SessionState = {
  isSessionActive: boolean;
  setIsSessionActive: (session: boolean) => void;
};
type SelectedTabState = {
  selectedTab: string;
  setSelectedTab: (tab:string) => void;
};

export const useChatAssignStatusStore = create<ChatState>((set: any) => ({
  waAssignStatus: "",
  setWaAssignStatus: (status: string) => set({ waAssignStatus: status }),
}));

export const useSelectedTabStore = create<SelectedTabState>((set: any) => ({
  selectedTab: "New",
  setSelectedTab: (tab: string) => set({ selectedTab: tab }),
}));

export const useContactIdStore = create<SelectedContactState>((set: any) => ({
  selectedContactId: null,
  setSelectedContactId: (contactId: string) =>
    set({ selectedContactId: contactId }),
}));

export const useSessionActiveStore = create<SessionState>((set:any) => ({
  isSessionActive: true,
  setIsSessionActive: (session: boolean) =>
    set({ isSessionActive: session }),
}));

type ChatFilterStore = {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
};

export const useChatFilterStore = create<ChatFilterStore>((set) => ({
  filter: {
    messageType: "usermessages",
    strictFilter: false,
    searchTerm: "",
    contactGroups: [],
    campaigns: [],
    tags: [],
    waMessageAssignStatus: "New",
    blockedUsers: false,
    newStatuses: [],
  },
  setFilter: (value) => set({ filter: value }),
}));


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
  removeMedia: (key: string) => Promise<void>;
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  media: [],
  addMedia: (value) => set((state) => ({ media: [...state.media, value] })),
  resetMedia: () => set(() => ({ media: [] })),
  removeMedia: async (key) => {
    try {
      await deleteUploadedFiles({ fileKeyArray: [{ Key: key }] }); // ☁️ Delete from cloud
      set((state) => ({
        media: state.media.filter((m) => m.key !== key), // 🧹 Remove from store
      }));
    } catch (err) {
      console.error("Failed to delete media:", err);
    }
  },
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
    message: Omit<Message, "contactId" | "timestamp" | "isOutgoing">
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

interface VoiceRecordState {
  isRecording: boolean;
  audioUrl: string | null;
  setAudioUrl: (url: string | null) => void;
  setIsRecording: (recording: boolean) => void;
}

export const useVoiceRecordStore = create<VoiceRecordState>((set) => ({
  isRecording: false,
  audioUrl: null,
  setAudioUrl: (url) => set({ audioUrl: url }),
  setIsRecording: (isRecording) => set({ isRecording }),
}));
