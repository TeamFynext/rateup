import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const LinktreeContext = createContext(null);
const LinktreeEditorTabContext = createContext(null);
const LinktreeEditorSetTabContext = createContext(null);

function LinktreeContextProvider({
  linktreeData,
  children,
  activeTab,
  setActiveTab,
}: {
  linktreeData: unknown;
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
