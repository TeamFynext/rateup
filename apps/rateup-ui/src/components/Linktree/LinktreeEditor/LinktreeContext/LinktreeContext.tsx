import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { LinktreeData } from "@/backend/linktree/linktree.api";

// Only read inside `LinktreeContextProvider`; the defaults stand in for
// "not yet provided".
const LinktreeContext = createContext<LinktreeData>({} as LinktreeData);
const LinktreeEditorTabContext = createContext<string>("links");
const LinktreeEditorSetTabContext = createContext<(tab: string) => void>(() => {});

function LinktreeContextProvider({
  linktreeData,
  children,
  activeTab,
  setActiveTab,
}: {
  linktreeData: LinktreeData;
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <LinktreeContext.Provider value={linktreeData}>
      <LinktreeEditorTabContext.Provider value={activeTab}>
        <LinktreeEditorSetTabContext.Provider value={setActiveTab}>
          {children}
        </LinktreeEditorSetTabContext.Provider>
      </LinktreeEditorTabContext.Provider>
    </LinktreeContext.Provider>
  );
}

function useLinktreeObj() {
  return useContext(LinktreeContext);
}

function useSetLinktreeEditorTab() {
  return useContext(LinktreeEditorSetTabContext);
}

export { LinktreeContextProvider, useLinktreeObj, useSetLinktreeEditorTab };
