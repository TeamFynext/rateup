import { create } from "zustand";

/**
 * A one-shot request, from an inbox deep link with `history`, to open the thread's
 * past-conversations strip already expanded. The strip clears it once it has acted.
 */
interface ConversationHistoryRequest {
  contactId: string | null;
  requestFor: (contactId: string | null) => void;
}

export const useConversationHistoryRequest = create<ConversationHistoryRequest>()((set) => ({
  contactId: null,
  requestFor: (contactId) => set({ contactId }),
}));
