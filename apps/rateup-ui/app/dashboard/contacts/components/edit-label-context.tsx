// edit-task-context.tsx
"use client";

import { createContext, use, useMemo, useState } from "react";

import { useDisclosure } from "@mantine/hooks";

type EditLabelsContextType = {
  opened: boolean;
  open: () => void;
  close: () => void;
  label: any;
  setLabel: (label: any) => void;
};

const EditLabelsContext = createContext<EditLabelsContextType | undefined>(
  undefined,
);

export function EditLabelsProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [opened, { open, close }] = useDisclosure(false);
  const [label, setLabel] = useState<any>(null);

  const contextValue = useMemo(
    () => ({ opened, open, close, label, setLabel }),
    [opened, open, close, label],
  );

  return (
    <EditLabelsContext.Provider value={contextValue}>
      {children}
    </EditLabelsContext.Provider>
  );
}

export const useEditLabelsCtx = () => {
  const ctx = use(EditLabelsContext);
  if (!ctx)
    throw new Error("useEditLabels must be used inside EditLabelsProvider");
  return ctx;
};
