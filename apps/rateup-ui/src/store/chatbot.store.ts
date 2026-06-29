import { create } from "zustand";

// Define the type for your state
interface ChatbotState {
  selectedChatbotId: string | null;
  setSelectedChatbotId: (id: string | null) => void;
}

// Define the Zustand store using create
export const useChatbotStore = create<ChatbotState>((set) => ({
  selectedChatbotId: null,
  setSelectedChatbotId: (id) => set({ selectedChatbotId: id }),
}));
