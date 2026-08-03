import type { Editor } from "@tiptap/react";
import React from "react";

export interface ToolbarContextProps {
  editor: Editor;
}

export const ToolbarContext = React.createContext<ToolbarContextProps | null>(null);

interface ToolbarProviderProps {
  editor: Editor;
  children: React.ReactNode;
}

/**
 * The toolbar is only ever mounted alongside its `EditorContent`, so callers
 * assert the editor here rather than every button optional-chaining it.
 */
export const ToolbarProvider = ({ editor, children }: ToolbarProviderProps) => {
  return <ToolbarContext.Provider value={{ editor }}>{children}</ToolbarContext.Provider>;
};

export const useToolbar = () => {
  const context = React.useContext(ToolbarContext);

  if (!context) {
    throw new Error("useToolbar must be used within a ToolbarProvider");
  }

  return context;
};
