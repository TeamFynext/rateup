"use client";

import { createContext, useContext, useState } from "react";

const IsChatDisplayOpen = createContext(false);
const SetIsChatDisplayOpen = createContext(null);

// This is used for opening chatDisplay in mobile, when we click on chat select card.
function ChatDisplayContext({ children }) {
  const [isChatDisplayOpen, setIsChatDisplayOpen] = useState(false);
  return (
    <IsChatDisplayOpen.Provider value={isChatDisplayOpen}>
      <SetIsChatDisplayOpen.Provider value={setIsChatDisplayOpen}>
        {children}
      </SetIsChatDisplayOpen.Provider>
    </IsChatDisplayOpen.Provider>
  );
}

export function useIsChatDisplayOpen() {
  return useContext(IsChatDisplayOpen);
}

export function useSetIsChatDisplayOpen() {
  return useContext(SetIsChatDisplayOpen);
}

export default ChatDisplayContext;
