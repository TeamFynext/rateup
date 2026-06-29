import { create } from "zustand";
import { WaMessageAssignStatus, ContactsWithLastMessage } from "../api/inbox/types";
import { deleteUploadedFiles } from "./fileUpload";

type ChatState = {
  waAssignStatus: string;
  setWaAssignStatus: (status: string) => void;
};
type SelectedContactData = ContactsWithLastMessage & {
  sessionActive: boolean;
};

type SelectedContactState = {
  selectedContact: SelectedContactData | null;
  setSelectedContact: (contact: SelectedContactData | null) => void;
};
type SessionState = {
  isSessionActive: boolean;
  setIsSessionActive: (session: boolean) => void;
};

type SelectedTabState = {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
};

export const useChatAssignStatusStore = create<ChatState>((set: any) => ({
  waAssignStatus: "",
  setWaAssignStatus: (status: string) => set({ waAssignStatus: status }),
}));

export const useSelectedTabStore = create<SelectedTabState>((set: any) => ({
  selectedTab: "New",
  setSelectedTab: (tab: string) => set({ selectedTab: tab }),
}));

export const useSelectedContactStore = create<SelectedContactState>((set: any) => ({
  selectedContact: null,
  setSelectedContact: (contact: SelectedContactData | null) =>
    set({ selectedContact: contact }),
}));

export const useSessionActiveStore = create<SessionState>((set: any) => ({
  isSessionActive: true,
  setIsSessionActive: (session: boolean) => set({ isSessionActive: session }),
}));


export type ChatFilter = {
  messageType: "all" | "replied" | "unread" | "usermessages";
  strictFilter: boolean;
  searchTerm?: string;
  contactGroups: Array<any>;
  campaigns: Array<any>;
  tags: Array<any>;
  waMessageAssignStatus?: string | null;
  blockedUsers: boolean;
  status: string[];
  assignedTeams: string[];
  phone?: string;
  labels: string[];
  sortBy: "newest" | "oldest";
  category: "conversation" | "campaign" | "automation" | null;
  lifecycle?: string;
  assignedUserIds: string[];
};
interface Props {
  setFilterCount: (value: number) => void;
}

type ChatFilterStore = {
  filter: ChatFilter;
  setFilter: (value: ChatFilter) => void;
  clearFilter: () => void;
  previousFilterForTab: {
    tab: string;
    filter: ChatFilter;
  }[];
  setPreviousFilterForTab: (value:any) => void;
};

// export const useChatFilterStore = create<ChatFilterStore>((set) => ({
//   filter: {
//     messageType: "usermessages",
//     strictFilter: false,
//     searchTerm: "",
//     contactGroups: [],
//     campaigns: [],
//     tags: [],
//     waMessageAssignStatus: "New",
//     blockedUsers: false,
//     newStatuses: [],
//   },
//   setFilter: (value) => set({ filter: value }),
// }));

const intialValues: ChatFilter = {
  messageType: "usermessages",
  strictFilter: false,
  searchTerm: "",
  contactGroups: [],
  campaigns: [],
  tags: [],
  waMessageAssignStatus: null,
  blockedUsers: false,
  status: Object.values(WaMessageAssignStatus).filter(
    (st) => st !== WaMessageAssignStatus.NEW,
  ),
  assignedTeams: [],
  phone: "all",
  labels: [],
  lifecycle: "",
  sortBy: "newest",
  category: null,
  assignedUserIds: [],
};

export const useChatFilterStore = create<ChatFilterStore>((set) => ({
  filter: intialValues,

  setFilter: (value) =>
    set({
      filter: value,
    }),

  previousFilterForTab: [],

  setPreviousFilterForTab: (value) =>
    set({
      previousFilterForTab: value,
    }),

  clearFilter: () => {
    set({
      filter: intialValues,
    });
  },
}));
type FlowStatus = "all" | "PUBLISHED" | "DRAFT";
type AlphabeticalOrder = "A-Z" | "Z-A" | null;

export const useFlowFilterStore = create<any>((set) => ({
  teamId: "all",
  status: "all" as FlowStatus,
  sortByDate: "latest" as "latest" | "oldest",
  alphabetical: null as AlphabeticalOrder,

  setTeamId: (id: string) => set({ teamId: id }),
  setStatus: (status: FlowStatus) => set({ status }),
  setSortByDate: (order: "latest" | "oldest") => set({ sortByDate: order }),
  setAlphabetical: (order: AlphabeticalOrder) => set({ alphabetical: order }),

  resetFilters: () =>
    set({
      teamId: "all",
      status: "all",
      sortByDate: "latest",
      alphabetical: null,
    }),
}));

type WebFormStatus = "all" | "ACTIVE" | "PAUSED";
export const useWebFormFilterStore = create<any>((set) => ({
  teamId: "all",
  status: "all" as WebFormStatus,
  sortByDate: "latest" as "latest" | "oldest",
  alphabetical: null as AlphabeticalOrder,

  setTeamId: (id: string) => set({ teamId: id }),
  setStatus: (status: WebFormStatus) => set({ status }),
  setSortByDate: (order: "latest" | "oldest") => set({ sortByDate: order }),
  setAlphabetical: (order: AlphabeticalOrder) => set({ alphabetical: order }),

  resetFilters: () =>
    set({
      teamId: "all",
      status: "all",
      sortByDate: "latest",
      alphabetical: null,
    }),
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

type Message1 = any;

interface LiveMessageStore {
  messages: Message1[];
  addMessage: (msg: Message1) => void;
  clearMessages: () => void;
}

export const useLiveMessages = create<LiveMessageStore>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [msg, ...state.messages], // for FlashList inverted
    })),
  clearMessages: () => set({ messages: [] }),
}));

type AuthState = {
  isAuthenticated: boolean | null;
  loading: boolean;
  userId: string | null;
  orgId: string | null;
  setIsAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setUserId: (id: string | null) => void;
  setOrgId: (id: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: null,
  loading: true,
  userId: null,
  orgId: null,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (loading) => set({ loading }),
  setUserId: (userId) => set({ userId }),
  setOrgId: (orgId) => set({ orgId }),
}));

type SearchFlowState = {
  search: string;
  setSearch: (value: string) => void;
  reset: () => void;
};

export const useSearchFlowStore = create<SearchFlowState>()((set) => ({
  search: "",
  setSearch: (value) => set({ search: value }),
  reset: () => set({ search: "" }),
}));

type SearchWebFormState = {
  search: string;
  setSearch: (value: string) => void;
  reset: () => void;
};

export const useSearchWebFormStore = create<SearchWebFormState>()((set) => ({
  search: "",
  setSearch: (value) => set({ search: value }),
  reset: () => set({ search: "" }),
}));

type FlowResponseDataStore = {
  data: any[];
  setData: (newData: any[]) => void;
};

export const useFlowResponseDataStore = create<FlowResponseDataStore>(
  (set) => ({
    data: [],
    setData: (newData) => set({ data: newData }),
  })
);

type FlowDataStore = {
  flowData: any[];
  setFlowData: (newData: any[]) => void;
};

export const useFlowDataStore = create<FlowDataStore>((set) => ({
  flowData: [],
  setFlowData: (newData) => set({ flowData: newData }),
}));

type WebFormResponseDataStore = {
  data: any[];
  setData: (newData: any[]) => void;
};

export const useWebFormResponseDataStore = create<WebFormResponseDataStore>(
  (set) => ({
    data: [],
    setData: (newData) => set({ data: newData }),
  })
);


type WaMedia = {
  type: string;
  url: string;
  name: string;
  key: string;
  uploading?: boolean;
};

interface MediaStore {
  media: WaMedia[];
  addMedia: (value: WaMedia) => void;
  removeMedia: (key) => void;
  resetMedia: () => void;
  selectedMedia: WaMedia;
  setSelectedMedia: (value) => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
  media: [],
  addMedia: (value) => set((state) => ({ media: [...state.media, value] })),
  selectedMedia: null,
  setSelectedMedia: (value) => set(() => ({ selectedMedia: value })),
  removeMedia: async (key) => {
    await deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
    set((state) => {
      const medias = state.media.filter((m) => m.key !== key);
      return { media: medias };
    });
  },
  resetMedia: () => set(() => ({ media: [] })),
}));
